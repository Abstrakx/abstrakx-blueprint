import { Octokit } from "octokit";
import { DocFile } from "../types";
import { supabase } from "./supabase";
import { scanNotesFromMarkdown } from "./notes-scanner";

// Cache for in-memory retrieval to speed up UI
const memoryCache: Record<string, string> = {};

/**
 * Creates an Octokit client. Falls back to public requests if token is missing.
 */
export function getOctokit(token?: string): Octokit {
  const options: any = {
    request: {
      headers: {
        "X-GitHub-Api-Version": "2026-03-10",
      },
    },
  };
  if (token) {
    options.auth = token;
  }
  return new Octokit(options);
}

/**
 * Fetches the directory tree of a GitHub repository docs directory.
 * Returns a nested DocFile array structure.
 */
export async function fetchDocsTree(
  owner: string,
  repo: string,
  path: string = "docs",
  branch: string = "main",
  token?: string,
): Promise<DocFile[]> {
  try {
    const octokit = getOctokit(token);

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    const files: DocFile[] = [];

    for (const item of response.data) {
      if (item.type === "dir") {
        // Recursively fetch subdirectories
        const children = await fetchDocsTree(
          owner,
          repo,
          item.path,
          branch,
          token,
        );
        files.push({
          name: item.name,
          path: "/" + item.path,
          type: "dir",
          children,
        });
      } else if (item.type === "file" && item.name.endsWith(".md")) {
        files.push({
          name: item.name,
          path: "/" + item.path,
          type: "file",
        });
      }
    }

    return files;
  } catch (error) {
    console.error("Error fetching docs tree from GitHub:", error);
    return [];
  }
}

/**
 * Fetches a single file content from GitHub.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch: string = "main",
  token?: string,
): Promise<string> {
  const cacheKey = `${owner}/${repo}/${branch}${filePath}`;
  if (memoryCache[cacheKey]) {
    return memoryCache[cacheKey];
  }

  try {
    const octokit = getOctokit(token);
    // Remove leading slash if present for Octokit path
    const cleanPath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: cleanPath,
      ref: branch,
    });

    if ("content" in response.data) {
      // Decode base64 content safely supporting UTF-8 (emojis etc)
      const b64 = response.data.content.replace(/\n/g, "");
      const decoded = new TextDecoder("utf-8").decode(
        Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      );
      memoryCache[cacheKey] = decoded;
      return decoded;
    }
    throw new Error("Not a file");
  } catch (error) {
    console.error(`Error fetching file ${filePath} from GitHub:`, error);
    return `# Document Not Found\n\nThe file \`${filePath}\` was not found in the repository branch \`${branch}\`.`;
  }
}

/**
 * Syncs the entire /docs directory of a project into Supabase (Option B).
 * Devs run this to populate cached_docs and compiled_notes for viewers.
 */
export async function syncDocsToSupabase(
  projectId: string,
  owner: string,
  repo: string,
  branch: string = "main",
  token?: string,
  docsDir: string = "docs",
  commitSha?: string,
  syncedBy?: string,
): Promise<void> {
  const cleanDocsDir = docsDir.replace(/^\//, "") || "docs";
  const docsTree = await fetchDocsTree(
    owner,
    repo,
    cleanDocsDir,
    branch,
    token,
  );

  const flattenTree = (tree: DocFile[]): string[] => {
    let result: string[] = [];
    for (const node of tree) {
      if (node.type === "file") {
        result.push(node.path);
      } else if (node.children) {
        result.push(...flattenTree(node.children));
      }
    }
    return result;
  };

  const filePaths = flattenTree(docsTree);

  // Sync each file
  for (const filePath of filePaths) {
    const content = await fetchFileContent(
      owner,
      repo,
      filePath,
      branch,
      token,
    );

    // Save to cached_docs table
    const { error: docError } = await supabase.from("cached_docs").upsert(
      {
        project_id: projectId,
        file_path: filePath,
        content: content,
        commit_sha: commitSha || null,
        synced_by: syncedBy || null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "project_id,file_path" },
    );

    if (docError) console.error("Error caching doc:", docError);

    // Scan for notes and save them
    const notes = scanNotesFromMarkdown(content, filePath);

    // First, clear old notes for this file
    await supabase
      .from("compiled_notes")
      .delete()
      .eq("project_id", projectId)
      .eq("file_path", filePath);

    if (notes.length > 0) {
      const dbNotes = notes.map((n) => ({
        project_id: projectId,
        title: n.title,
        file_path: n.file_path,
        line_number: n.line_number,
        author: n.author,
      }));

      const { error: notesError } = await supabase
        .from("compiled_notes")
        .insert(dbNotes);

      if (notesError) console.error("Error inserting notes:", notesError);
    }
  }

  // PRUNING: Clean up deleted files/notes that are no longer present on GitHub
  try {
    const { data: cachedDocs } = await supabase
      .from("cached_docs")
      .select("file_path")
      .eq("project_id", projectId);

    if (cachedDocs) {
      const cachedPaths = cachedDocs.map((d: any) => d.file_path);
      const pathsToDelete = cachedPaths.filter((p) => !filePaths.includes(p));

      if (pathsToDelete.length > 0) {
        // Delete documents from cache
        const { error: pruneDocsErr } = await supabase
          .from("cached_docs")
          .delete()
          .eq("project_id", projectId)
          .in("file_path", pathsToDelete);

        if (pruneDocsErr) console.error("Error pruning cached docs:", pruneDocsErr);

        // Delete notes from cache
        const { error: pruneNotesErr } = await supabase
          .from("compiled_notes")
          .delete()
          .eq("project_id", projectId)
          .in("file_path", pathsToDelete);

        if (pruneNotesErr) console.error("Error pruning compiled notes:", pruneNotesErr);
      }
    }
  } catch (pruneErr) {
    console.error("Failed to prune stale cached docs:", pruneErr);
  }

  // Cache recent commits in cached_docs under virtual path '__commits__'
  try {
    const commits = await fetchRecentCommits(owner, repo, branch, token);
    if (commits && commits.length > 0) {
      const { error: commitsError } = await supabase.from("cached_docs").upsert(
        {
          project_id: projectId,
          file_path: "__commits__",
          content: JSON.stringify(commits),
          synced_by: syncedBy || null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "project_id,file_path" },
      );
      if (commitsError) console.error("Error caching commits:", commitsError);
    }
  } catch (commitErr) {
    console.error("Failed to cache recent commits:", commitErr);
  }
}

/**
 * Fetches the 5 most recent commits from a branch.
 */
export async function fetchRecentCommits(
  owner: string,
  repo: string,
  branch: string = "main",
  token?: string,
): Promise<any[]> {
  try {
    const octokit = getOctokit(token);
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: 5,
    });

    return response.data.map((item: any) => {
      const authorName =
        item.commit?.author?.name || item.author?.login || "Unknown";
      const message = item.commit?.message || "No commit message";
      const dateStr = item.commit?.author?.date;

      let timeString = "some time ago";
      if (dateStr) {
        const diffMs = new Date().getTime() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 60) {
          timeString = `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
        } else if (diffHrs < 24) {
          timeString = `${diffHrs} hour${diffHrs !== 1 ? "s" : ""} ago`;
        } else {
          timeString = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        }
      }

      return {
        sha: item.sha?.substring(0, 7) || "unknown",
        author: authorName,
        msg: message.split("\n")[0],
        time: timeString,
      };
    });
  } catch (error) {
    console.error("Error fetching commits from GitHub:", error);
    return [];
  }
}
