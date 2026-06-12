import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { KnowledgeViewer } from '../components/knowledge/KnowledgeViewer';
import { NotesCompiler } from '../components/notes/NotesCompiler';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchDocsTree, fetchFileContent, syncDocsToSupabase, fetchRecentCommits, getOctokit } from '../lib/github';
import { Project, Task, DocFile, CompiledNote, TeamMember } from '../types';
import { GitFork, Clock, RefreshCw } from 'lucide-react';

type ViewMode = 'overview' | 'knowledge' | 'notes' | 'tasks';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, githubToken } = useAuth();

  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  
  // Auth details
  const [userRole, setUserRole] = useState<'owner' | 'developer' | 'viewer'>('viewer');

  // Docs Tree & Active Doc Content
  const [docsTree, setDocsTree] = useState<DocFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [docContent, setDocContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isSyncingDocs, setIsSyncingDocs] = useState<boolean>(false);

  // Notes & Tasks
  const [notes, setNotes] = useState<CompiledNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentCommits, setRecentCommits] = useState<any[]>([]);

  // Fetch Project and Team Members
  useEffect(() => {
    if (!projectId) return;

    const loadWorkspaceData = async () => {
      try {
        setIsLoadingProject(true);
        
        // 1. Fetch project from Supabase
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projErr || !projData) {
          showToast('Workspace project not found', 'warning');
          navigate('/dashboard');
          return;
        }

        setProject(projData as Project);

        // 2. Fetch team members
        const { data: membersData, error: membersErr } = await supabase
          .from('team_members')
          .select('*')
          .eq('project_id', projectId);

        if (!membersErr && membersData) {
          setTeamMembers(membersData as TeamMember[]);
          
          // 3. Resolve role for the current user
          const memberRecord = membersData.find(m => m.user_id === user?.id);
          if (memberRecord) {
            setUserRole(memberRecord.role as 'owner' | 'developer' | 'viewer');
          } else {
            // Default role if not explicitly in team_members: Google auth -> viewer, GitHub -> developer
            const provider = user?.app_metadata?.provider;
            setUserRole(provider === 'google' ? 'viewer' : 'developer');
          }
        }

        // 4. Fetch recent GitHub commits
        const [owner, repo] = (projData.github_repo || '').split('/');
        if (owner && repo) {
          try {
            const commits = await fetchRecentCommits(
              owner,
              repo,
              projData.branch || 'main',
              githubToken || undefined
            );
            setRecentCommits(commits);
          } catch (gitErr) {
            console.error('Failed to fetch recent commits:', gitErr);
          }
        }
      } catch (err: any) {
        console.error('Error loading workspace:', err);
        showToast('Failed to load workspace data', 'warning');
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadWorkspaceData();
  }, [projectId, user]);

  // Load documentation tree structure
  useEffect(() => {
    if (!project) return;

    const loadDocsTree = async () => {
      const [owner, repo] = project.github_repo.split('/');
      const docsPath = project.docs_dir?.replace(/^\//, '') || 'docs';
      
      try {
        if (userRole === 'viewer') {
          // Viewers load doc structure cached in Supabase (Option B)
          const { data, error } = await supabase
            .from('cached_docs')
            .select('file_path')
            .eq('project_id', project.id);

          if (error || !data || data.length === 0) {
            console.log('No cached docs found, falling back to git structures');
            const tree = await fetchDocsTree(owner, repo, docsPath, project.branch, githubToken || undefined);
            setDocsTree(tree);
            return;
          }

          // Reconstruct nested structure from flat array of cached paths
          const reconstructedTree = reconstructTreeFromPaths(data.map(d => d.file_path));
          setDocsTree(reconstructedTree);
        } else {
          // Developers load live docs tree structure from GitHub
          const tree = await fetchDocsTree(owner, repo, docsPath, project.branch, githubToken || undefined);
          setDocsTree(tree);
        }
      } catch (err) {
        console.error('Error loading docs tree:', err);
      }
    };

    loadDocsTree();
  }, [project, userRole, githubToken]);

  // Handle active document change - load file content
  useEffect(() => {
    if (!project || !activeFilePath) return;

    const loadContent = async () => {
      setIsLoadingContent(true);
      const [owner, repo] = project.github_repo.split('/');

      try {
        if (userRole === 'viewer') {
          // Viewers load cached documentation content from Supabase
          const { data, error } = await supabase
            .from('cached_docs')
            .select('content')
            .eq('project_id', project.id)
            .eq('file_path', activeFilePath)
            .single();

          if (!error && data) {
            setDocContent(data.content);
          } else {
            // Fallback to fetch live if missing
            const liveContent = await fetchFileContent(owner, repo, activeFilePath, project.branch, githubToken || undefined);
            setDocContent(liveContent);
          }
        } else {
          // Developers fetch live file contents directly from GitHub
          const liveContent = await fetchFileContent(owner, repo, activeFilePath, project.branch, githubToken || undefined);
          setDocContent(liveContent);
        }
      } catch (err) {
        console.error('Error loading file content:', err);
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, [activeFilePath, project, userRole, githubToken]);

  // Load and Scan compiled notes
  useEffect(() => {
    if (!project) return;

    const loadNotes = async () => {
      try {
        // Fetch compiled notes directly from database cache
        const { data, error } = await supabase
          .from('compiled_notes')
          .select('*')
          .eq('project_id', project.id);

        if (!error && data) {
          setNotes(data.map(item => ({
            id: item.id,
            title: item.title,
            file_path: item.file_path,
            line_number: item.line_number,
            author: item.author
          })));
        }
      } catch (err) {
        console.error('Error loading compiled notes:', err);
      }
    };

    loadNotes();
  }, [project, docContent]);

  // Load tasks and setup Realtime synchronization channel
  useEffect(() => {
    if (!project) return;

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)
          .order('sort_order', { ascending: true });

        if (!error && data) {
          setTasks(data);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };

    fetchTasks();

    // Subscribe to tasks realtime changes
    const channel = supabase
      .channel(`realtime:tasks:${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks((prev) => {
              // Avoid duplicates if local state was already optimistically updated
              if (prev.some(t => t.id === newTask.id)) return prev;
              return [...prev, newTask];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          } else if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as Task;
            setTasks((prev) => prev.filter((t) => t.id !== deletedTask.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project]);

  // Sync docs manually (Developers only)
  const handleSyncDocs = async () => {
    if (!project) return;
    try {
      setIsSyncingDocs(true);
      showToast('Starting Git Zero-Clone documentation compilation...', 'info');
      const [owner, repo] = project.github_repo.split('/');
      const docsPath = project.docs_dir?.replace(/^\//, '') || 'docs';
      
      // Fetch latest commit SHA for tracking/caching
      let latestCommitSha: string | undefined = undefined;
      try {
        const octokit = getOctokit(githubToken || undefined);
        const branchRes = await octokit.rest.repos.getBranch({
          owner,
          repo,
          branch: project.branch,
        });
        latestCommitSha = branchRes.data.commit.sha;
      } catch (commitErr) {
        console.error('Failed to fetch latest commit SHA during sync:', commitErr);
      }

      await syncDocsToSupabase(
        project.id,
        owner,
        repo,
        project.branch,
        githubToken || undefined,
        docsPath,
        latestCommitSha,
        user?.id || undefined
      );
      showToast('Documentation cached to Supabase successfully!', 'success');
      
      // Reload docs tree & content after sync
      const tree = await fetchDocsTree(owner, repo, docsPath, project.branch, githubToken || undefined);
      setDocsTree(tree);
      if (activeFilePath) {
        const liveContent = await fetchFileContent(owner, repo, activeFilePath, project.branch, githubToken || undefined);
        setDocContent(liveContent);
      }
    } catch (err: any) {
      showToast(err.message || 'Documentation sync failed', 'warning');
    } finally {
      setIsSyncingDocs(false);
    }
  };

  // Task Mutators
  const handleToggleTask = async (id: string, done: boolean) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));

    const { error } = await supabase
      .from('tasks')
      .update({ done })
      .eq('id', id);

    if (error) {
      console.error('Error toggling task:', error);
      showToast('Realtime sync toggle failed', 'warning');
    }
  };

  const handleAddTask = async (text: string, assignee: string) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    const newTask = {
      id: tempId,
      project_id: project!.id,
      text,
      assignee,
      done: false,
      sort_order: tasks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic UI update
    setTasks(prev => [...prev, newTask]);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: project!.id,
        text,
        assignee,
        done: false,
        sort_order: tasks.length
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting task:', error);
      // Rollback optimistic update
      setTasks(prev => prev.filter(t => t.id !== tempId));
      throw new Error('Failed to insert task');
    } else if (data) {
      // Replace temp task with database task
      setTasks(prev => prev.map(t => t.id === tempId ? data : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Optimistic UI update
    const deletedTask = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      // Rollback
      if (deletedTask) {
        setTasks(prev => [...prev, deletedTask]);
      }
      showToast('Failed to delete task', 'warning');
    }
  };

  // Helper: set active doc and switch view
  const handleNoteNavigate = (filePath: string) => {
    setActiveFilePath(filePath);
    setActiveView('knowledge');
  };

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-text text-sm">
        Project Workspace Not Found
      </div>
    );
  }

  // Set default active file path if empty
  if (docsTree.length > 0 && !activeFilePath) {
    const firstFile = findFirstMarkdownFile(docsTree);
    if (firstFile) setActiveFilePath(firstFile);
  }

  return (
    <div className="flex h-screen bg-bg text-text overflow-hidden select-none">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        currentView={activeView}
        onViewChange={setActiveView}
        projectName={project.name}
        repoName={project.github_repo}
        teamMembers={teamMembers}
      />

      {/* CORE WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* OVERVIEW TAB VIEW */}
        {activeView === 'overview' && (
          <div className="flex-1 overflow-y-auto p-8 md:p-12 max-w-[900px] mx-auto w-full font-sans animate-fade-in-up">
            <div className="mb-10 pb-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">{project.name}</h1>
                <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                  <span className="font-mono bg-bg-elevated px-2 py-0.5 border border-border rounded flex items-center gap-1">
                    <GitFork size={12} /> {project.github_repo}
                  </span>
                  <span>•</span>
                  <span>Branch: <strong>{project.branch}</strong></span>
                </div>
              </div>
              
              {userRole !== 'viewer' && (
                <button 
                  onClick={handleSyncDocs}
                  disabled={isSyncingDocs}
                  className="px-4 py-2 bg-accent text-bg rounded-md text-[13px] font-semibold hover:opacity-90 flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.15)] disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncingDocs ? 'animate-spin' : ''} />
                  Force Git Sync
                </button>
              )}
            </div>

            {/* SYNC METRICS CARD */}
            <div className="bg-bg-elevated border border-border rounded-xl p-6 mb-8 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-text mb-1">Last Synchronization</h4>
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    Sinkronisasi otomatis dengan server GitHub API berjalan setiap merge commit di branch utama.
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs font-mono font-semibold text-accent bg-accent-dim border border-accent/20 px-2.5 py-1 rounded-full">
                  Auto-Sync Active
                </span>
                <div className="text-[11px] text-text-muted font-mono mt-2.5">Last update: Live</div>
              </div>
            </div>

            {/* STATS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="bg-bg-elevated border border-border rounded-xl p-6 flex flex-col justify-between h-[140px]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.8px] text-text-muted mb-2">Total Scanned Notes</h3>
                  <div className="text-3xl font-bold tracking-tight">{notes.length}</div>
                </div>
                <div className="text-xs text-accent font-medium flex items-center gap-1 cursor-pointer" onClick={() => setActiveView('notes')}>
                  View all tags →
                </div>
              </div>

              <div className="bg-bg-elevated border border-border rounded-xl p-6 flex flex-col justify-between h-[140px]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.8px] text-text-muted mb-2">Pending Tasks</h3>
                  <div className="text-3xl font-bold tracking-tight">{tasks.filter(t => !t.done).length}</div>
                </div>
                <div className="text-xs text-accent font-medium flex items-center gap-1 cursor-pointer" onClick={() => setActiveView('tasks')}>
                  Open task board →
                </div>
              </div>
            </div>

            {/* GIT LATEST ACTIVITY FEED */}
            <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-text-muted flex items-center gap-2 mb-5 before:content-[''] before:w-1 before:h-4 before:bg-accent before:rounded-full">
              Git Commit Stream & Activity
            </h3>
            <div className="bg-bg-elevated border border-border rounded-xl p-6 space-y-5">
              {recentCommits.length === 0 ? (
                <div className="text-xs text-text-muted italic py-2 text-center">
                  No commits loaded or repository is unauthenticated
                </div>
              ) : (
                recentCommits.map((c: any) => (
                  <CommitItem
                    key={c.sha}
                    author={c.author}
                    msg={c.msg}
                    time={c.time}
                    sha={c.sha}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* KNOWLEDGE VIEW TAB */}
        {activeView === 'knowledge' && (
          <KnowledgeViewer 
            files={docsTree}
            activeFilePath={activeFilePath}
            onActiveFileChange={setActiveFilePath}
            content={docContent}
            isLoadingContent={isLoadingContent}
            onSync={handleSyncDocs}
            isSyncing={isSyncingDocs}
            canSync={userRole !== 'viewer'}
          />
        )}

        {/* NOTES COMPILER TAB VIEW */}
        {activeView === 'notes' && (
          <NotesCompiler 
            notes={notes}
            onNoteClick={handleNoteNavigate}
            isLoading={false}
          />
        )}

        {/* TASK BOARD TAB VIEW */}
        {activeView === 'tasks' && (
          <TaskBoard 
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            userRole={userRole}
            teamMembers={teamMembers}
          />
        )}

      </div>
    </div>
  );
}

// Helpers for reconstructed tree reconstruction (from flat array of paths)
function reconstructTreeFromPaths(paths: string[]): DocFile[] {
  const root: DocFile[] = [];

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = '/' + parts.slice(0, i + 1).join('/');

      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        existingNode = {
          name: part,
          path: currentPath,
          type: isLast ? 'file' : 'dir',
          children: isLast ? undefined : []
        };
        currentLevel.push(existingNode);
      }

      if (!isLast && existingNode.children) {
        currentLevel = existingNode.children;
      }
    }
  }

  return root;
}

function findFirstMarkdownFile(tree: DocFile[]): string | null {
  for (const node of tree) {
    if (node.type === 'file') {
      return node.path;
    } else if (node.children) {
      const childFile = findFirstMarkdownFile(node.children);
      if (childFile) return childFile;
    }
  }
  return null;
}

function CommitItem({ author, msg, time, sha }: { author: string; msg: string; time: string; sha: string }) {
  return (
    <div className="flex justify-between items-start gap-4 text-xs">
      <div className="flex gap-3 min-w-0">
        <div className="w-5 h-5 rounded bg-bg-card border border-border flex items-center justify-center font-bold text-[9px] text-accent shrink-0">
          {author[0]}
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-text">{author}</span>{' '}
          <span className="text-text-secondary truncate block sm:inline">{msg}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 font-mono text-[10px] text-text-muted shrink-0">
        <span>{time}</span>
        <span className="bg-bg-card px-1.5 py-0.5 rounded border border-border">{sha}</span>
      </div>
    </div>
  );
}
