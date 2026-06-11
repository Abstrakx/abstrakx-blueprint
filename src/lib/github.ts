import { Octokit } from 'octokit';
import { DocFile } from '../types';
import { supabase } from './supabase';
import { scanNotesFromMarkdown } from './notes-scanner';

// Cache for in-memory retrieval to speed up UI
const memoryCache: Record<string, string> = {};

/**
 * Creates an Octokit client. Falls back to public requests if token is missing.
 */
export function getOctokit(token?: string): Octokit {
  if (token) {
    return new Octokit({ auth: token });
  }
  return new Octokit();
}

/**
 * Fetches the directory tree of a GitHub repository docs directory.
 * Returns a nested DocFile array structure.
 */
export async function fetchDocsTree(
  owner: string,
  repo: string,
  path: string = 'docs',
  branch: string = 'main',
  token?: string
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
      if (item.type === 'dir') {
        // Recursively fetch subdirectories
        const children = await fetchDocsTree(owner, repo, item.path, branch, token);
        files.push({
          name: item.name,
          path: '/' + item.path,
          type: 'dir',
          children,
        });
      } else if (item.type === 'file' && item.name.endsWith('.md')) {
        files.push({
          name: item.name,
          path: '/' + item.path,
          type: 'file',
        });
      }
    }

    return files;
  } catch (error) {
    console.error('Error fetching docs tree from GitHub:', error);
    // Return a basic mock structure if GitHub API fails or rate-limits
    return getMockDocsTree();
  }
}

/**
 * Fetches a single file content from GitHub.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch: string = 'main',
  token?: string
): Promise<string> {
  const cacheKey = `${owner}/${repo}/${branch}${filePath}`;
  if (memoryCache[cacheKey]) {
    return memoryCache[cacheKey];
  }

  try {
    const octokit = getOctokit(token);
    // Remove leading slash if present for Octokit path
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: cleanPath,
      ref: branch,
    });

    if ('content' in response.data) {
      // Decode base64 content
      const decoded = atob(response.data.content.replace(/\n/g, ''));
      memoryCache[cacheKey] = decoded;
      return decoded;
    }
    throw new Error('Not a file');
  } catch (error) {
    console.error(`Error fetching file ${filePath} from GitHub:`, error);
    // Return mock content based on name
    return getMockFileContent(filePath);
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
  branch: string = 'main',
  token?: string
): Promise<void> {
  const docsTree = await fetchDocsTree(owner, repo, 'docs', branch, token);
  
  const flattenTree = (tree: DocFile[]): string[] => {
    let result: string[] = [];
    for (const node of tree) {
      if (node.type === 'file') {
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
    const content = await fetchFileContent(owner, repo, filePath, branch, token);
    
    // Save to cached_docs table
    const { error: docError } = await supabase
      .from('cached_docs')
      .upsert({
        project_id: projectId,
        file_path: filePath,
        content: content,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'project_id,file_path' });

    if (docError) console.error('Error caching doc:', docError);

    // Scan for notes and save them
    const notes = scanNotesFromMarkdown(content, filePath);
    
    // First, clear old notes for this file
    await supabase
      .from('compiled_notes')
      .delete()
      .eq('project_id', projectId)
      .eq('file_path', filePath);

    if (notes.length > 0) {
      const dbNotes = notes.map(n => ({
        project_id: projectId,
        title: n.title,
        file_path: n.file_path,
        line_number: n.line_number,
        author: n.author
      }));

      const { error: notesError } = await supabase
        .from('compiled_notes')
        .insert(dbNotes);

      if (notesError) console.error('Error inserting notes:', notesError);
    }
  }
}

// ==========================================
// MOCK DATA FALLBACKS FOR DEMO/DEVELOPMENT
// ==========================================

function getMockDocsTree(): DocFile[] {
  return [
    {
      name: 'architecture.md',
      path: '/docs/architecture.md',
      type: 'file'
    },
    {
      name: 'installation.md',
      path: '/docs/installation.md',
      type: 'file'
    },
    {
      name: 'api-reference.md',
      path: '/docs/api-reference.md',
      type: 'file'
    },
    {
      name: 'workflows',
      path: '/docs/workflows',
      type: 'dir',
      children: [
        {
          name: 'git-flow.md',
          path: '/docs/workflows/git-flow.md',
          type: 'file'
        },
        {
          name: 'ci-cd.md',
          path: '/docs/workflows/ci-cd.md',
          type: 'file'
        }
      ]
    }
  ];
}

function getMockFileContent(filePath: string): string {
  if (filePath.endsWith('architecture.md')) {
    return `# System Architecture

Welcome to the **Unity Robotics Simulation Pipeline** architecture documentation. This project synchronizes real-world robot physics and actuators with a virtual digital twin inside Unity.

## Flow Diagram

Here is the high-level communications sequence:

\`\`\`mermaid
sequenceDiagram
    participant Controller as ROS2 Nav2 Stack
    participant Bridge as Unity ROS TCP Connector
    participant Engine as Unity Physics Engine
    participant Robot as URDF Digital Twin

    Controller->>Bridge: Publish cmd_vel (velocity commands)
    Bridge->>Robot: Apply forces to articulation joints
    Engine->>Engine: Run PhysX solver (continuous collision)
    Robot->>Bridge: Read joint encoders & lidar sensors
    Bridge->>Controller: Publish sensor_msgs/LaserScan & JointState
\`\`\`

💡 NOTE: Pastikan port TCP bridge configured di 10000 agar tidak conflict dengan gRPC port.

## Database Relationships

Below is the database entity relational structure:

\`\`\`mermaid
erDiagram
    PROJECTS ||--o{ TEAM_MEMBERS : houses
    PROJECTS ||--o{ TASKS : assigns
    PROJECTS {
        uuid id PK
        string name
        string repo_url
    }
    TEAM_MEMBERS {
        uuid id PK
        uuid project_id FK
        string name
        string role
    }
    TASKS {
        uuid id PK
        uuid project_id FK
        string text
        string assignee
        boolean done
    }
\`\`\`

## System Requirements
- Unity 6.0 LTS (or higher)
- ROS2 Humble Hawksbill on Ubuntu 22.04 LTS
- CUDA-enabled NVIDIA GPU (GTX 1660 or higher recommended)
`;
  }
  
  if (filePath.endsWith('installation.md')) {
    return `# Installation Guide

Follow these steps to set up the robotics simulation pipeline locally.

## Prerequisite Commands
\`\`\`bash
# Install ROS2 Humble desktop
sudo apt update && sudo apt install ros-humble-desktop -y

# Setup ROS workspace
mkdir -p ~/colcon_ws/src
cd ~/colcon_ws
colcon build
\`\`\`

💡 NOTE: Syaiful - Selalu source setup.bash di terminal baru sebelum launching simulator.

## Unity Project Configuration
1. Clone the repository: \`git clone git@github.com:abstrakx/unity-project.git\`
2. Open in **Unity Hub** using Editor version \`2023.2.x\`.
3. Open package manager and verify **Unity Robotics Hub** is loaded.
`;
  }

  if (filePath.endsWith('api-reference.md')) {
    return `# API Reference

Details of topics and messages mapped between ROS2 and Unity.

| ROS2 Topic | Message Type | Direction | Description |
|---|---|---|---|
| \`/cmd_vel\` | \`geometry_msgs/Twist\` | ROS2 → Unity | Drive commands for differential wheels |
| \`/scan\` | \`sensor_msgs/LaserScan\` | Unity → ROS2 | 2D LiDAR point clouds |
| \`/joint_states\` | \`sensor_msgs/JointState\` | Unity → ROS2 | Encoders values from articulation limbs |

💡 NOTE: Hendra - Selalu check frequency rate lidar di Unity inspector agar tidak drop di bawah 10Hz.
`;
  }

  if (filePath.endsWith('git-flow.md')) {
    return `# Git Workflows

Our team adheres to a strict branching strategy.

\`\`\`mermaid
gitGraph
    commit id: "v0.1"
    branch develop
    checkout develop
    commit id: "init-sim"
    branch feature/robot-arm
    checkout feature/robot-arm
    commit id: "add-urdf"
    commit id: "fix-mesh"
    checkout develop
    merge feature/robot-arm
    commit id: "prep-release"
    checkout main
    merge develop tag: "v0.2"
\`\`\`

## Branch Naming Conventions
- Features: \`feature/short-description\`
- Bugfixes: \`bugfix/issue-id-description\`
- Hotfixes: \`hotfix/description\`
`;
  }

  if (filePath.endsWith('ci-cd.md')) {
    return `# CI/CD Documentation

We use GitHub Actions to automate asset validation and test builds.

💡 NOTE: Iqbal - Runner docker harus running di GPU instance agar headless Unity build bisa berjalan.
`;
  }

  return `# Documentation File

Content for **${filePath.split('/').pop()}** is not found or rate-limited. This is a generic fallback.
`;
}
