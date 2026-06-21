import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { LogOut, Plus, RefreshCw, FolderGit2, Users, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { fetchUserRepos, fetchRepoBranches } from "../lib/github-user";
import { SearchableDropdown } from "../components/ui/SearchableDropdown";
import { syncDocsToSupabase } from "../lib/github";
import { UpdaterModal } from "../components/updater/UpdaterModal";

export function DashboardPage() {
  const { user, signOut, githubToken, activeProvider } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Dialog / Modal states
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isUpdaterOpen, setIsUpdaterOpen] = useState(false);

  // Projects and stats states
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [docsCount, setDocsCount] = useState(0);

  // Repository & Branch fetching states
  const [repoOptions, setRepoOptions] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [docsFolder, setDocsFolder] = useState("/docs");
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Add team member states
  const [targetProjectId, setTargetProjectId] = useState("");
  const [memberRole, setMemberRole] = useState("developer");
  const [customTitle, setCustomTitle] = useState("");
  const [ownerTitle, setOwnerTitle] = useState("Project Manager");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profileAvatars, setProfileAvatars] = useState<Record<string, string>>({});

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const displayInitial = displayName[0].toUpperCase();
  const isGithubUser = (
    user?.app_metadata?.provider === 'github' ||
    user?.app_metadata?.providers?.includes('github') ||
    user?.identities?.some((id: any) => id.provider === 'github')
  ) && !!githubToken;
  const ownedProjects = projects.filter((proj) =>
    proj.team_members?.some((tm: any) => tm.user_id === user?.id && tm.role === "owner")
  );

  // Load projects from database
  const loadProjects = async () => {
    try {
      setIsLoadingProjects(true);

      // Fetch public profiles first to resolve team member avatar images
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, avatar_url");

      const avatarMap: Record<string, string> = {};
      if (profData) {
        profData.forEach((p) => {
          if (p.avatar_url) {
            avatarMap[p.id] = p.avatar_url;
          }
        });
      }
      setProfileAvatars(avatarMap);

      const { data, error } = await supabase
        .from("projects")
        .select("*, team_members(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      showToast(err.message || "Failed to load projects", "warning");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Load overall documentation count
  const loadDocsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("cached_docs")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      setDocsCount(count || 0);
    } catch (err) {
      console.error("Error fetching docs count:", err);
    }
  };

  useEffect(() => {
    loadProjects();
    loadDocsCount();

    // Silently check if an update is available on startup
    const checkUpdatesSilently = async () => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (!isTauri) return;

      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          setIsUpdaterOpen(true);
        }
      } catch (err) {
        console.error('Silent update check failed:', err);
      }
    };

    checkUpdatesSilently();
  }, []);

  // Fetch registered user profiles when "Add Team Member" modal opens
  useEffect(() => {
    if (!isAddMemberOpen) return;

    const getProfiles = async () => {
      setIsLoadingProfiles(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, display_name");

        if (error) throw error;
        setProfiles(data || []);
        if (data && data.length > 0) {
          setSelectedProfileId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error fetching profiles:", err);
        showToast("Failed to load user profiles.", "warning");
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    getProfiles();
  }, [isAddMemberOpen]);

  // Fetch repositories when "Add Project" modal opens
  useEffect(() => {
    if (!isAddProjectOpen) return;

    // Clear previous options
    setSelectedRepo("");
    setSelectedBranch("");
    setBranchOptions([]);

    if (!githubToken) {
      showToast("GitHub OAuth token missing. Authenticate with GitHub to fetch private repos.", "warning");
      return;
    }

    const getRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const repos = await fetchUserRepos(githubToken);
        setRepoOptions(
          repos.map((r) => ({
            value: r.full_name,
            label: r.name,
            details: r.full_name,
            isPrivate: r.private,
            defaultBranch: r.default_branch,
          }))
        );
      } catch (err: any) {
        console.error("Failed to fetch repos:", err);
        showToast("Error loading GitHub repositories. Check connection.", "warning");
      } finally {
        setIsLoadingRepos(false);
      }
    };

    getRepos();
  }, [isAddProjectOpen, githubToken]);

  // Fetch branches when repository selection changes
  useEffect(() => {
    if (!selectedRepo || !githubToken) return;

    const getBranches = async () => {
      setIsLoadingBranches(true);
      try {
        const [owner, repoName] = selectedRepo.split("/");
        const branches = await fetchRepoBranches(githubToken, owner, repoName);
        setBranchOptions(branches.map((b) => ({ value: b, label: b })));

        // Pre-select default branch
        const currentRepo = repoOptions.find((r) => r.value === selectedRepo);
        if (currentRepo && branches.includes(currentRepo.defaultBranch)) {
          setSelectedBranch(currentRepo.defaultBranch);
        } else if (branches.length > 0) {
          setSelectedBranch(branches[0]);
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err);
        showToast("Error loading repository branches.", "warning");
      } finally {
        setIsLoadingBranches(false);
      }
    };

    getBranches();
  }, [selectedRepo, githubToken, repoOptions]);

  // Pre-fill target project ID when "Add Member" modal opens
  useEffect(() => {
    if (isAddMemberOpen && ownedProjects.length > 0 && !targetProjectId) {
      setTargetProjectId(ownedProjects[0].id);
    }
  }, [isAddMemberOpen, ownedProjects, targetProjectId]);

  const handleLogout = async () => {
    try {
      showToast("Logging out...", "info");
      await signOut();
      navigate("/login");
    } catch (err: any) {
      showToast(err.message || "Failed to log out", "warning");
    }
  };

  const handleAddProject = async () => {
    if (!selectedRepo) {
      showToast("Please select a repository first.", "warning");
      return;
    }
    if (!selectedBranch) {
      showToast("Please select a branch.", "warning");
      return;
    }

    showToast(user?.id || "Kosong bre");

    try {
      showToast("Creating project metadata...", "info");

      const repoName = selectedRepo.split("/")[1] || selectedRepo;

      // 1. Insert project
      const { data: newProj, error: projErr } = await supabase
        .from("projects")
        .insert({
          name: repoName,
          github_repo: selectedRepo,
          docs_dir: docsFolder,
          branch: selectedBranch,
          status: "active",
          created_by: user?.id,
        })
        .select()
        .single();

      if (projErr) throw projErr;

      // 2. Insert creator as team member owner
      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({
          project_id: newProj.id,
          user_id: user?.id,
          name: displayName,
          role: "owner",
          title: ownerTitle.trim() || "Project Manager",
          avatar_color: "#22c55e",
        });

      if (memberErr) throw memberErr;

      showToast("Project connected! Syncing docs in background...", "success");
      setIsAddProjectOpen(false);
      loadProjects();

      // 3. Trigger initial git sync in the background
      const [owner, repo] = selectedRepo.split("/");
      syncDocsToSupabase(newProj.id, owner, repo, selectedBranch, githubToken || undefined, docsFolder)
        .then(() => {
          showToast(`Initial sync complete for ${repoName}!`, "success");
          loadDocsCount();
        })
        .catch((syncErr) => {
          console.error("Sync error:", syncErr);
          showToast(`Background sync failed for ${repoName}.`, "warning");
        });

    } catch (err: any) {
      console.error("Error creating project:", err);
      showToast(err.message || "Failed to create project", "warning");
    }
  };

  const handleAddMember = async () => {
    if (!targetProjectId) {
      showToast("Please select a project.", "warning");
      return;
    }
    if (!selectedProfileId) {
      showToast("Please select a registered user.", "warning");
      return;
    }

    try {
      const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
      if (!selectedProfile) {
        showToast("Selected user profile not found.", "warning");
        return;
      }
      const selectedName = selectedProfile.display_name || selectedProfile.email?.split("@")[0] || "User";

      // Pick a random avatar color for UI
      const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { error } = await supabase
        .from("team_members")
        .insert({
          project_id: targetProjectId,
          user_id: selectedProfileId,
          name: selectedName,
          role: memberRole,
          title: customTitle.trim() || null,
          avatar_color: randomColor,
        });

      if (error) throw error;

      showToast("Team member successfully added!", "success");
      setIsAddMemberOpen(false);
      setCustomTitle("");
      setSelectedProfileId("");
      loadProjects();
    } catch (err: any) {
      console.error("Error adding team member:", err);
      showToast(err.message || "Failed to add member. Check constraints.", "warning");
    }
  };

  // Helper calculation for unique team member count
  const uniqueMemberCount = new Set(
    projects.flatMap((p) => p.team_members?.map((tm: any) => tm.user_id || tm.name) || [])
  ).size;

  return (
    <div className="min-h-screen bg-bg text-text p-6 md:p-10 font-sans">
      <div className="max-w-[1200px] mx-auto">
        {/* TOP BAR */}
        <header className="flex justify-between items-center mb-12 pb-6 border-b border-border animate-fade-in-down">
          <div className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img src="/Logo.png" alt="Abstrakx Logo" className="w-full h-full object-contain p-1.5 rounded-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight leading-tight">
                Abstrakx Blueprint
              </h2>
              <p className="text-[11px] text-text-muted uppercase tracking-[1.2px]">
                by Abstrakx Enterprise
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-text-secondary text-[13px]">
                Logged in as <strong>{displayName}</strong>
              </span>
              <span className="text-[10px] text-text-muted capitalize font-mono">
                via {activeProvider || user?.app_metadata?.provider || 'credential'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-accent to-[#16a34a] flex items-center justify-center font-semibold text-sm text-bg cursor-pointer hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.2)] overflow-hidden">
              {isGithubUser && (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) &&
              ((user.user_metadata.avatar_url || user.user_metadata.picture).includes('githubusercontent.com') ||
               (user.user_metadata.avatar_url || user.user_metadata.picture).includes('github.com')) ? (
                <img
                  src={user.user_metadata.avatar_url || user.user_metadata.picture}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                displayInitial
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-bg-elevated border border-border rounded-md text-[13px] font-medium hover:bg-bg-hover hover:border-border-hover transition-colors flex items-center gap-2"
            >
              <LogOut size={14} />{" "}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* WELCOME HERO */}
        <section className="mb-10 animate-fade-in-up animation-delay-100">
          <h1 className="text-3xl font-bold tracking-tight mb-2 bg-linear-to-br from-white to-text-secondary bg-clip-text text-transparent">
            Welcome back, Captain! 🚀
          </h1>
          <p className="text-text-secondary text-[15px] max-w-[600px] leading-relaxed">
            Sistem manajemen knowledge base & sinkronisasi task otomatis
            berbasis repositori Git internal perusahaan.
          </p>
        </section>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in-up animation-delay-200">
          <StatCard label="Active Projects" value={projects.filter(p => p.status === 'active').length.toString()} change="From database" />
          <StatCard label="Team Members" value={uniqueMemberCount.toString()} change="Total collaborators" />
          <StatCard label="Git Repos Connected" value={projects.length.toString()} change="Live connection" />
          <StatCard label="Docs Cached" value={docsCount.toString()} change="Supabase Cached (B)" />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 animate-fade-in-up animation-delay-300">
          {/* LEFT COLUMN */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-text-muted flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:bg-accent before:rounded-full">
                Active Corporate Projects
              </h3>
              {isGithubUser && (
                <button
                  onClick={() => setIsAddProjectOpen(true)}
                  className="px-3.5 py-1.5 bg-accent text-bg font-semibold text-[12px] rounded-md hover:opacity-90 hover:-translate-y-px hover:shadow-[0_0_20px_rgba(34,197,94,0.25)] transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} /> New Project
                </button>
              )}
            </div>

            {isLoadingProjects ? (
              <div className="flex flex-col items-center justify-center py-20 border border-border border-dashed rounded-xl gap-4 bg-bg-card">
                <RefreshCw size={24} className="animate-spin text-accent" />
                <div className="text-xs text-text-secondary">Loading projects from Supabase...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-border border-dashed rounded-xl text-center p-8 bg-bg-card mb-2">
                <FolderGit2 size={36} className="text-text-muted mb-4" />
                <h4 className="text-sm font-semibold mb-1 text-text">No Projects Connected</h4>
                {isGithubUser ? (
                  <>
                    <p className="text-xs text-text-secondary max-w-[280px] mx-auto mb-6">
                      Hubungkan repositori Git pertama kamu untuk memulai mapping documentation dan task board.
                    </p>
                    <button
                      onClick={() => setIsAddProjectOpen(true)}
                      className="px-4 py-2 bg-accent text-bg text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
                    >
                      Connect Git Repository
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-text-secondary max-w-[280px] mx-auto mb-6">
                    Menunggu invitation dari Project Owner. Hubungi admin untuk ditambahkan ke dalam tim.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 mb-8">
                {projects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    title={proj.name}
                    repo={proj.github_repo}
                    description={`Tracking branch: ${proj.branch} | Docs: ${proj.docs_dir}`}
                    members={proj.team_members?.map((tm: any) => ({
                      initial: tm.name[0].toUpperCase(),
                      color: tm.avatar_color || "#3b82f6",
                      avatarUrl: tm.user_id ? profileAvatars[tm.user_id] : undefined,
                    })) || []}
                    status={proj.status === "active" ? "Active" : "Idle"}
                    onClick={() => navigate(`/workspace/${proj.id}`)}
                  />
                ))}
              </div>
            )}

            <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-text-muted flex items-center gap-2 mb-5 before:content-[''] before:w-1 before:h-4 before:bg-accent before:rounded-full">
              Quick Configuration Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              {ownedProjects.length > 0 && (
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-4 py-2.5 bg-bg-elevated border border-border rounded-md text-[13px] font-medium hover:bg-bg-hover hover:border-border-hover transition-all flex items-center gap-2"
                >
                  <Users size={16} className="text-blue-400" /> Add Team Member
                </button>
              )}
              {isGithubUser && (
                <button
                  onClick={() => setIsAddProjectOpen(true)}
                  className="px-4 py-2.5 bg-bg-elevated border border-border rounded-md text-[13px] font-medium hover:bg-bg-hover hover:border-border-hover transition-all flex items-center gap-2"
                >
                  <FolderGit2 size={16} className="text-amber-400" /> Index Git
                  Repository
                </button>
              )}
              <button
                onClick={() => setIsUpdaterOpen(true)}
                className="px-4 py-2.5 bg-bg-elevated border border-border rounded-md text-[13px] font-medium hover:bg-bg-hover hover:border-border-hover transition-all flex items-center gap-2"
              >
                <Sparkles size={16} className="text-green-400 animate-pulse" /> Check for Updates
              </button>
              <button
                onClick={loadProjects}
                className="px-4 py-2.5 bg-transparent border border-dashed border-border-hover rounded-md text-[13px] font-medium hover:border-accent hover:text-accent transition-all flex items-center gap-2"
              >
                <RefreshCw size={14} /> Refresh List
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-text-muted flex items-center gap-2 mb-5 before:content-[''] before:w-1 before:h-4 before:bg-accent before:rounded-full">
              How Blueprint Works
            </h3>
            <div className="bg-bg-card border border-border rounded-xl p-6 sticky top-6">
              <GuideStep
                step="1"
                title="Connect Git Repo"
                desc="Blueprint memantau folder khusus (default: /docs) langsung dari repositori GitHub internal korporat."
              />
              <GuideStep
                step="2"
                title="Write Documentation"
                desc="Tulis file Markdown standar. Gunakan tag penanda seperti 💡 NOTE: di dalam file untuk dikompilasi otomatis."
              />
              <GuideStep
                step="3"
                title="Assign & Sync Tasks"
                desc="Atur pembagian kerja tim per-individu. Setiap perubahan status task akan tersinkronisasi via Supabase realtime."
                isLast
              />

              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4">
                  System Status
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-text-secondary">Git Sync</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center gap-1.5 before:w-1.5 before:h-1.5 before:bg-accent before:rounded-full before:animate-pulse">
                      Online
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-text-secondary">
                      Supabase Realtime
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center gap-1.5 before:w-1.5 before:h-1.5 before:bg-accent before:rounded-full before:animate-pulse">
                      Connected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <Modal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        title="Connect New Git Project"
        description="Sinkronisasi folder dokumentasi dari remote repository."
      >
        <div className="space-y-4">
          <SearchableDropdown
            label="Select GitHub Repository"
            placeholder="Search your repositories..."
            options={repoOptions}
            value={selectedRepo}
            onChange={setSelectedRepo}
            isLoading={isLoadingRepos}
          />

          <SearchableDropdown
            label="Tracking Branch"
            placeholder="Select a branch..."
            options={branchOptions}
            value={selectedBranch}
            onChange={setSelectedBranch}
            isLoading={isLoadingBranches}
            disabled={!selectedRepo}
          />

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Documentation Folder Path
            </label>
            <input
              type="text"
              className="w-full bg-bg border border-border rounded-md px-3.5 py-2 text-xs focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
              value={docsFolder}
              onChange={(e) => setDocsFolder(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Your Role / Title in Project
            </label>
            <input
              type="text"
              className="w-full bg-bg border border-border rounded-md px-3.5 py-2 text-xs focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all placeholder:text-text-muted"
              value={ownerTitle}
              onChange={(e) => setOwnerTitle(e.target.value)}
              placeholder="e.g. Project Manager, Lead Dev"
            />
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-border">
            <button
              onClick={() => setIsAddProjectOpen(false)}
              className="px-4 py-2 bg-bg-elevated border border-border rounded-md text-[13px] font-medium hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProject}
              className="px-4 py-2 bg-accent text-bg rounded-md text-[13px] font-semibold hover:opacity-90"
            >
              Link Repository
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add Team Member"
        description="Berikan hak akses kolaborator ke workspace tracking internal."
      >
        <div className="space-y-4">
          <div>
            <SearchableDropdown
              label="Select Target Project"
              options={ownedProjects.map((proj) => ({
                value: proj.id,
                label: proj.name,
                details: proj.github_repo,
              }))}
              value={targetProjectId}
              onChange={setTargetProjectId}
              placeholder="Search project by name or repo..."
            />
          </div>
          <div>
            <SearchableDropdown
              label="Select User Profile"
              options={profiles.map((p) => ({
                value: p.id,
                label: p.display_name || p.email || "Unknown User",
                details: p.email,
              }))}
              value={selectedProfileId}
              onChange={(val) => setSelectedProfileId(val)}
              placeholder="Search user by name or email..."
              isLoading={isLoadingProfiles}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              Custom Title / Designation
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-bg border border-border rounded-md px-3.5 py-2 text-xs focus:border-accent outline-none transition-all placeholder:text-text-muted"
              placeholder="e.g. Unity Dev, Lead Designer"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1.5">
              System Role / Permissions
            </label>
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="w-full bg-bg border border-border rounded-md px-3.5 py-2 text-xs focus:border-accent outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="developer">Developer (Can Edit Tasks)</option>
              <option value="viewer">Viewer / Client (Read-Only)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-border">
            <button
              onClick={() => setIsAddMemberOpen(false)}
              className="px-4 py-2 bg-bg-elevated border border-border rounded-md text-[13px] font-medium hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              className="px-4 py-2 bg-accent text-bg rounded-md text-[13px] font-semibold hover:opacity-90"
            >
              Add Member
            </button>
          </div>
        </div>
      </Modal>

      <UpdaterModal
        isOpen={isUpdaterOpen}
        onClose={() => setIsUpdaterOpen(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 hover:translate-y-[-3px] hover:border-border-hover hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all">
      <div className="text-[12px] text-text-muted uppercase tracking-[0.8px] mb-2">
        {label}
      </div>
      <div className="text-[28px] font-bold tracking-tight">{value}</div>
      <div className="text-[12px] mt-1 font-medium text-accent">
        {change}
      </div>
    </div>
  );
}

function ProjectCard({
  title,
  repo,
  description,
  members,
  status,
  onClick,
}: {
  title: string;
  repo: string;
  description: string;
  members: { initial: string; color: string; avatarUrl?: string }[];
  status: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-bg-card border border-border rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start gap-4 cursor-pointer overflow-hidden transition-all hover:bg-bg-hover hover:border-accent hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex-1">
        <h3 className="text-base font-semibold mb-2 flex items-center gap-2.5 flex-wrap">
          {title}
          <span className="font-mono text-[11px] text-text-secondary bg-bg-elevated px-2.5 py-0.5 rounded-md border border-border">
            {repo}
          </span>
        </h3>
        <p className="text-[13px] text-text-secondary leading-relaxed max-w-[480px]">
          {description}
        </p>
      </div>
      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 min-w-[120px] w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center">
          {members.map((m, i) => {
            const isGitHubUrl = m.avatarUrl && (m.avatarUrl.includes("githubusercontent.com") || m.avatarUrl.includes("github.com"));
            return (
              <div
                key={i}
                className="w-7 h-7 rounded-full border-[2.5px] border-bg-card flex items-center justify-center text-[10px] font-bold text-white -ml-2 first:ml-0 relative hover:z-10 hover:scale-110 transition-transform overflow-hidden"
                style={{ backgroundColor: isGitHubUrl ? undefined : m.color }}
              >
                {isGitHubUrl ? (
                  <img src={m.avatarUrl} alt={m.initial} className="w-full h-full object-cover" />
                ) : (
                  m.initial
                )}
              </div>
            );
          })}
        </div>
        <span
          className={`text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${status === "Active" ? "bg-accent/10 text-accent border border-accent/20 before:w-1.5 before:h-1.5 before:bg-accent before:rounded-full before:animate-pulse" : "bg-text-muted/15 text-text-muted border border-border"}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function GuideStep({
  step,
  title,
  desc,
  isLast,
}: {
  step: string;
  title: string;
  desc: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`relative pl-8 ${isLast ? "" : "mb-6 pb-5 border-b border-border"} group`}
    >
      <div className="absolute left-0 top-0 w-6 h-6 bg-bg-elevated border border-border rounded-full flex items-center justify-center text-[11px] font-bold text-text-muted font-mono transition-colors group-hover:bg-accent/10 group-hover:border-accent group-hover:text-accent">
        {step}
      </div>
      <h4 className="text-[14px] font-semibold mb-2 text-text">{title}</h4>
      <p className="text-[13px] text-text-secondary leading-relaxed">{desc}</p>
    </div>
  );
}
