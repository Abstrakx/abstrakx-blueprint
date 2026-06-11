import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { KnowledgeViewer } from '../components/knowledge/KnowledgeViewer';
import { NotesCompiler } from '../components/notes/NotesCompiler';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { fetchDocsTree, fetchFileContent, syncDocsToSupabase } from '../lib/github';
import { scanNotesFromMarkdown } from '../lib/notes-scanner';
import { Project, Task, DocFile, CompiledNote } from '../types';
import { GitFork, Clock, RefreshCw } from 'lucide-react';

type ViewMode = 'overview' | 'knowledge' | 'notes' | 'tasks';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [project, setProject] = useState<Project | null>(null);
  
  // Auth details
  const [userRole, setUserRole] = useState<'owner' | 'developer' | 'viewer'>('developer'); // default to dev for testing
  const [githubToken, setGithubToken] = useState<string | undefined>(undefined);

  // Docs Tree & Active Doc Content
  const [docsTree, setDocsTree] = useState<DocFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [docContent, setDocContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isSyncingDocs, setIsSyncingDocs] = useState<boolean>(false);

  // Notes & Tasks
  const [notes, setNotes] = useState<CompiledNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Mock projects configuration based on routing
  const mockProjects: Record<string, Partial<Project>> = {
    unity: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Unity Robotics Project',
      github_repo: 'abstrakx/unity-project',
      branch: 'main',
      docs_dir: '/docs',
      status: 'active',
    },
    sambernyawa: {
      id: 'sambernyawa-gcs-id',
      name: 'Sambernyawa GCS',
      github_repo: 'sambernyawa/gcs-core',
      branch: 'develop',
      docs_dir: '/docs',
      status: 'idle',
    },
  };

  // Determine Project & Auth details
  useEffect(() => {
    if (!projectId || !mockProjects[projectId]) {
      showToast('Project workspace not found', 'warning');
      navigate('/dashboard');
      return;
    }

    const currentMockProj = mockProjects[projectId] as Project;
    setProject(currentMockProj);

    // Fetch user details from Supabase to determine role (Google OAuth -> Viewer, GitHub -> Dev/Owner)
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const provider = data.session.user.app_metadata?.provider;
        if (provider === 'google') {
          setUserRole('viewer');
        } else {
          setUserRole('developer');
          // Retrieve stored GitHub access token if available
          const token = data.session.provider_token;
          if (token) setGithubToken(token);
        }
      }
    };
    
    getSession();
  }, [projectId]);

  // Load documentation tree structure
  useEffect(() => {
    if (!project) return;

    const loadDocsTree = async () => {
      // Split owner and repo
      const [owner, repo] = project.github_repo.split('/');
      
      if (userRole === 'viewer') {
        // Option B: Viewers load docs structure cached in Supabase
        const { data, error } = await supabase
          .from('cached_docs')
          .select('file_path, content')
          .eq('project_id', project.id);

        if (error || !data || data.length === 0) {
          console.log('No cached docs found, falling back to git structures');
          const tree = await fetchDocsTree(owner, repo, 'docs', project.branch, githubToken);
          setDocsTree(tree);
          return;
        }

        // Reconstruct nested structure from flat array of cached paths
        const reconstructedTree = reconstructTreeFromPaths(data.map(d => d.file_path));
        setDocsTree(reconstructedTree);
      } else {
        // Developers load live docs tree structure from GitHub
        const tree = await fetchDocsTree(owner, repo, 'docs', project.branch, githubToken);
        setDocsTree(tree);
      }
    };

    loadDocsTree();
  }, [project, userRole]);

  // Handle active document change - load file content
  useEffect(() => {
    if (!project || !activeFilePath) return;

    const loadContent = async () => {
      setIsLoadingContent(true);
      const [owner, repo] = project.github_repo.split('/');

      if (userRole === 'viewer') {
        // Option B: Viewers load cached documentation content from Supabase
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
          const liveContent = await fetchFileContent(owner, repo, activeFilePath, project.branch, githubToken);
          setDocContent(liveContent);
        }
      } else {
        // Developers fetch live file contents directly from GitHub
        const liveContent = await fetchFileContent(owner, repo, activeFilePath, project.branch, githubToken);
        setDocContent(liveContent);
      }
      setIsLoadingContent(false);
    };

    loadContent();
  }, [activeFilePath, project, userRole]);

  // Load and Scan all compiled notes
  useEffect(() => {
    if (!project) return;

    const loadNotes = async () => {
      if (userRole === 'viewer') {
        // Viewers load pre-compiled notes from Supabase
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
          return;
        }
      }

      // Devs or Fallback: Scan notes dynamically from loaded content files
      // For this demo, let's extract notes from our flat list of files
      const [owner, repo] = project.github_repo.split('/');
      const scannedNotesList: CompiledNote[] = [];
      
      const filePaths = ['/docs/architecture.md', '/docs/installation.md', '/docs/api-reference.md', '/docs/workflows/git-flow.md', '/docs/workflows/ci-cd.md'];
      for (const path of filePaths) {
        const text = await fetchFileContent(owner, repo, path, project.branch, githubToken);
        const fileNotes = scanNotesFromMarkdown(text, path);
        scannedNotesList.push(...fileNotes);
      }
      setNotes(scannedNotesList);
    };

    loadNotes();
  }, [project, userRole, docContent]);

  // Load tasks and setup Realtime synchronization channel
  useEffect(() => {
    if (!project) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setTasks(data);
      } else {
        // Set mock tasks if Supabase is disconnected/not migrated yet
        setTasks(getMockTasks(project.id));
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
            setTasks((prev) => [...prev, newTask]);
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
      await syncDocsToSupabase(project.id, owner, repo, project.branch, githubToken);
      showToast('Documentation cached to Supabase successfully!', 'success');
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

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
      </div>
    );
  }

  // Set default active file path if empty
  if (docsTree.length > 0 && !activeFilePath) {
    // Find first markdown file in docsTree to show as default
    const firstFile = findFirstMarkdownFile(docsTree);
    if (firstFile) setActiveFilePath(firstFile);
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#e8e8e8] overflow-hidden select-none">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        currentView={activeView}
        onViewChange={setActiveView}
        projectName={project.name}
        repoName={project.github_repo}
      />

      {/* CORE WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* OVERVIEW TAB VIEW */}
        {activeView === 'overview' && (
          <div className="flex-1 overflow-y-auto p-8 md:p-12 max-w-[900px] mx-auto w-full font-sans animate-fade-in-up">
            <div className="mb-10 pb-6 border-b border-[#222222] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">{project.name}</h1>
                <div className="flex items-center gap-2.5 text-xs text-[#888888]">
                  <span className="font-mono bg-[#111111] px-2 py-0.5 border border-[#222222] rounded flex items-center gap-1">
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
                  className="px-4 py-2 bg-[#22c55e] text-[#0a0a0a] rounded-md text-[13px] font-semibold hover:opacity-90 flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.15)] disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncingDocs ? 'animate-spin' : ''} />
                  Force Git Sync
                </button>
              )}
            </div>

            {/* SYNC METRICS CARD */}
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 mb-8 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-[#e8e8e8] mb-1">Last Synchronization</h4>
                  <p className="text-[13px] text-[#888888] leading-relaxed">
                    Sinkronisasi otomatis dengan server GitHub API berjalan setiap merge commit di branch utama.
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs font-mono font-semibold text-accent bg-accent-dim border border-accent/20 px-2.5 py-1 rounded-full">
                  Auto-Sync Active
                </span>
                <div className="text-[11px] text-[#555555] font-mono mt-2.5">Last update: 5 mins ago</div>
              </div>
            </div>

            {/* STATS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col justify-between h-[140px]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.8px] text-[#555555] mb-2">Total Scanned Notes</h3>
                  <div className="text-3xl font-bold tracking-tight">{notes.length}</div>
                </div>
                <div className="text-xs text-accent font-medium flex items-center gap-1 cursor-pointer" onClick={() => setActiveView('notes')}>
                  View all tags →
                </div>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col justify-between h-[140px]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.8px] text-[#555555] mb-2">Pending Tasks</h3>
                  <div className="text-3xl font-bold tracking-tight">{tasks.filter(t => !t.done).length}</div>
                </div>
                <div className="text-xs text-accent font-medium flex items-center gap-1 cursor-pointer" onClick={() => setActiveView('tasks')}>
                  Open task board →
                </div>
              </div>
            </div>

            {/* GIT LATEST ACTIVITY FEED */}
            <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-[#555555] flex items-center gap-2 mb-5 before:content-[''] before:w-1 before:h-4 before:bg-[#22c55e] before:rounded-full">
              Git Commit Stream & Activity
            </h3>
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-5">
              <CommitItem author="Iqbal" msg="docs: update system architecture with sequences" time="2 hours ago" sha="a6f3b58" />
              <CommitItem author="Syaiful" msg="feat: calibrate joint stiffness values in Unity robot" time="5 hours ago" sha="c39a2f1" />
              <CommitItem author="Hendra" msg="fix: update lidar collision boundaries in asset URDF" time="1 day ago" sha="f9b4c2e" />
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
        <div className="w-5 h-5 rounded bg-[#161616] border border-[#222222] flex items-center justify-center font-bold text-[9px] text-accent shrink-0">
          {author[0]}
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-[#e8e8e8]">{author}</span>{' '}
          <span className="text-[#888888] truncate block sm:inline">{msg}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 font-mono text-[10px] text-[#555555] shrink-0">
        <span>{time}</span>
        <span className="bg-[#161616] px-1.5 py-0.5 rounded border border-[#222222]">{sha}</span>
      </div>
    </div>
  );
}

// Fallback Mock tasks
function getMockTasks(projectId: string): Task[] {
  return [
    {
      id: 'task-1',
      project_id: projectId,
      text: 'Write system architecture documentation',
      assignee: 'Iqbal',
      done: false,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-2',
      project_id: projectId,
      text: 'Setup GitHub Actions for docs validation',
      assignee: 'Iqbal',
      done: false,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-3',
      project_id: projectId,
      text: 'Initialize project repository structure',
      assignee: 'Iqbal',
      done: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-4',
      project_id: projectId,
      text: 'Implement ROS2 bridge in Unity',
      assignee: 'Syaiful',
      done: false,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-5',
      project_id: projectId,
      text: 'Configure sensor publisher nodes',
      assignee: 'Syaiful',
      done: false,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-6',
      project_id: projectId,
      text: 'Setup Unity Robotics Hub package',
      assignee: 'Syaiful',
      done: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-7',
      project_id: projectId,
      text: 'Create URDF model for robot arm',
      assignee: 'Hendra',
      done: false,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-8',
      project_id: projectId,
      text: 'Setup Docker ROS2 environment',
      assignee: 'Hendra',
      done: false,
      sort_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-9',
      project_id: projectId,
      text: 'Import mesh assets to Unity',
      assignee: 'Hendra',
      done: true,
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}
