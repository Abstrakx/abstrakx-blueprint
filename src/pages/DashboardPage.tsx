import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { LogOut, Plus, RefreshCw, FolderGit2, Users } from 'lucide-react';

export function DashboardPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const handleLogout = () => {
    showToast('Logging out...', 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] p-6 md:p-10 font-sans">
      <div className="max-w-[1200px] mx-auto">
        
        {/* TOP BAR */}
        <header className="flex justify-between items-center mb-12 pb-6 border-b border-[#222222] animate-fade-in-down">
          <div className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 bg-[#22c55e] rounded-xl flex items-center justify-center font-bold text-[#0a0a0a] text-lg shadow-[0_0_20px_rgba(34,197,94,0.25)] transition-all group-hover:-rotate-6 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.25)]">
              P
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight leading-tight">Abstrakx Blueprint</h2>
              <p className="text-[11px] text-[#555555] uppercase tracking-[1.2px]">Enterprise</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#888888] text-[13px] hidden sm:inline">Logged in as <strong>Iqbal</strong></span>
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center font-semibold text-sm text-[#0a0a0a] cursor-pointer hover:scale-110 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.2)]">I</div>
            <button onClick={handleLogout} className="px-3.5 py-1.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] font-medium hover:bg-[#1c1c1c] hover:border-[#333333] transition-colors flex items-center gap-2">
              <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* WELCOME HERO */}
        <section className="mb-10 animate-fade-in-up animation-delay-100">
          <h1 className="text-3xl font-bold tracking-tight mb-2 bg-linear-to-br from-white to-[#888888] bg-clip-text text-transparent">
            Welcome back, Captain! 🚀
          </h1>
          <p className="text-[#888888] text-[15px] max-w-[600px] leading-relaxed">
            Sistem manajemen knowledge base & sinkronisasi task otomatis berbasis repositori Git internal perusahaan.
          </p>
        </section>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-in-up animation-delay-200">
          <StatCard label="Active Projects" value="2" change="+1 this month" />
          <StatCard label="Team Members" value="5" change="All active" />
          <StatCard label="Git Commits" value="1,247" change="+34 today" />
          <StatCard label="Docs Synced" value="89" change="Auto-sync on" />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 animate-fade-in-up animation-delay-300">
          
          {/* LEFT COLUMN */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-[#555555] flex items-center gap-2 before:content-[''] before:w-1 before:h-4 before:bg-[#22c55e] before:rounded-full">
                Active Corporate Projects
              </h3>
              <button onClick={() => setIsAddProjectOpen(true)} className="px-3.5 py-1.5 bg-[#22c55e] text-[#0a0a0a] font-semibold text-[12px] rounded-md hover:opacity-90 hover:-translate-y-px hover:shadow-[0_0_20px_rgba(34,197,94,0.25)] transition-all flex items-center gap-1.5">
                <Plus size={14} /> New Project
              </button>
            </div>

            <div className="flex flex-col gap-3.5 mb-8">
              <ProjectCard 
                title="Unity Robotics Project"
                repo="abstrakx/unity-project"
                description="Simulation pipeline for autonomous robot research using Unity & ROS2 Humble. Integrated with NVIDIA Isaac Sim for physics validation."
                members={[{initial: 'I', color: '#22c55e'}, {initial: 'S', color: '#3b82f6'}, {initial: 'H', color: '#f59e0b'}]}
                status="Active"
                onClick={() => navigate('/workspace/unity')}
              />
              <ProjectCard 
                title="Sambernyawa GCS"
                repo="sambernyawa/gcs-core"
                description="Web-based intelligent Ground Control Station with modular AI integrations. Supports MAVLink protocol and real-time telemetry."
                members={[{initial: 'I', color: '#22c55e'}, {initial: 'S', color: '#3b82f6'}]}
                status="Idle"
                onClick={() => navigate('/workspace/sambernyawa')}
              />
            </div>

            <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-[#555555] flex items-center gap-2 mb-5 before:content-[''] before:w-1 before:h-4 before:bg-[#22c55e] before:rounded-full">
              Quick Configuration Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setIsAddMemberOpen(true)} className="px-4 py-2.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] font-medium hover:bg-[#1c1c1c] hover:border-[#333333] transition-all flex items-center gap-2">
                <Users size={16} className="text-blue-400" /> Add Team Member
              </button>
              <button onClick={() => setIsAddProjectOpen(true)} className="px-4 py-2.5 bg-[#111111] border border-[#222222] rounded-md text-[13px] font-medium hover:bg-[#1c1c1c] hover:border-[#333333] transition-all flex items-center gap-2">
                <FolderGit2 size={16} className="text-amber-400" /> Index Git Repository
              </button>
              <button onClick={() => showToast('Force sync initiated for all repositories...', 'info')} className="px-4 py-2.5 bg-transparent border border-dashed border-[#333333] rounded-md text-[13px] font-medium hover:border-[#22c55e] hover:text-[#22c55e] transition-all flex items-center gap-2">
                <RefreshCw size={14} /> Force Sync
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[1px] text-[#555555] flex items-center gap-2 mb-5 before:content-[''] before:w-1 before:h-4 before:bg-[#22c55e] before:rounded-full">
              How Blueprint Works
            </h3>
            <div className="bg-[#161616] border border-[#222222] rounded-xl p-6 sticky top-6">
              <GuideStep step="1" title="Connect Git Repo" desc="Blueprint memantau folder khusus (default: /docs) langsung dari repositori GitHub internal korporat." />
              <GuideStep step="2" title="Write Documentation" desc="Tulis file Markdown standar. Gunakan tag penanda seperti 💡 NOTE: di dalam file untuk dikompilasi otomatis." />
              <GuideStep step="3" title="Assign & Sync Tasks" desc="Atur pembagian kerja tim per-individu. Setiap perubahan status task akan tersinkronisasi via Supabase realtime." isLast />
              
              <div className="mt-8 pt-6 border-t border-[#222222]">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#555555] mb-4">System Status</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-[#888888]">Git Sync</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 flex items-center gap-1.5 before:w-1.5 before:h-1.5 before:bg-[#22c55e] before:rounded-full before:animate-pulse">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-[#888888]">Supabase Realtime</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 flex items-center gap-1.5 before:w-1.5 before:h-1.5 before:bg-[#22c55e] before:rounded-full before:animate-pulse">Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <Modal isOpen={isAddProjectOpen} onClose={() => setIsAddProjectOpen(false)} title="Connect New Git Project" description="Sinkronisasi folder dokumentasi dari remote repository.">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-2 uppercase tracking-[0.5px]">Repository URL</label>
            <input type="text" className="w-full bg-[#111111] border border-[#222222] rounded-md px-3.5 py-3 text-[14px] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] outline-none transition-all placeholder:text-[#555555]" placeholder="abstrakx/new-project" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-2 uppercase tracking-[0.5px]">Tracking Branch</label>
            <input type="text" className="w-full bg-[#111111] border border-[#222222] rounded-md px-3.5 py-3 text-[14px] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] outline-none transition-all" defaultValue="main" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-2 uppercase tracking-[0.5px]">Documentation Folder Path</label>
            <input type="text" className="w-full bg-[#111111] border border-[#222222] rounded-md px-3.5 py-3 text-[14px] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] outline-none transition-all" defaultValue="/docs" />
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-[#222222]">
            <button onClick={() => setIsAddProjectOpen(false)} className="px-4 py-2 bg-[#111111] border border-[#222222] rounded-md text-[13px] font-medium hover:bg-[#1c1c1c]">Cancel</button>
            <button onClick={() => { setIsAddProjectOpen(false); showToast('Project added! Fetching Git tree...', 'success'); }} className="px-4 py-2 bg-[#22c55e] text-[#0a0a0a] rounded-md text-[13px] font-semibold hover:opacity-90">Link Repository</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Add Team Member" description="Berikan hak akses kolaborator ke workspace tracking internal.">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-2 uppercase tracking-[0.5px]">Select Target Project</label>
            <select className="w-full bg-[#111111] border border-[#222222] rounded-md px-3.5 py-3 text-[14px] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] outline-none transition-all appearance-none cursor-pointer">
              <option>Unity Robotics Project</option>
              <option>Sambernyawa GCS</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-2 uppercase tracking-[0.5px]">Email / Username</label>
            <input type="text" className="w-full bg-[#111111] border border-[#222222] rounded-md px-3.5 py-3 text-[14px] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] outline-none transition-all placeholder:text-[#555555]" placeholder="syaiful@abstrakx.enterprise" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#888888] mb-2 uppercase tracking-[0.5px]">System Role</label>
            <select className="w-full bg-[#111111] border border-[#222222] rounded-md px-3.5 py-3 text-[14px] focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] outline-none transition-all appearance-none cursor-pointer">
              <option value="developer">Developer (GitHub Auth)</option>
              <option value="viewer">Viewer / Client (Google Auth)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-[#222222]">
            <button onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 bg-[#111111] border border-[#222222] rounded-md text-[13px] font-medium hover:bg-[#1c1c1c]">Cancel</button>
            <button onClick={() => { setIsAddMemberOpen(false); showToast('Member successfully added to project!', 'success'); }} className="px-4 py-2 bg-[#22c55e] text-[#0a0a0a] rounded-md text-[13px] font-semibold hover:opacity-90">Add Member</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

function StatCard({ label, value, change }: { label: string, value: string, change: string }) {
  return (
    <div className="bg-[#161616] border border-[#222222] rounded-xl p-5 hover:translate-y-[-3px] hover:border-[#333333] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-all">
      <div className="text-[12px] text-[#555555] uppercase tracking-[0.8px] mb-2">{label}</div>
      <div className="text-[28px] font-bold tracking-tight">{value}</div>
      <div className="text-[12px] mt-1 font-medium text-[#22c55e]">{change}</div>
    </div>
  );
}

function ProjectCard({ title, repo, description, members, status, onClick }: { title: string, repo: string, description: string, members: {initial: string, color: string}[], status: string, onClick: () => void }) {
  return (
    <div onClick={onClick} className="group relative bg-[#161616] border border-[#222222] rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start gap-4 cursor-pointer overflow-hidden transition-all hover:bg-[#1c1c1c] hover:border-[#22c55e] hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#22c55e] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex-1">
        <h3 className="text-base font-semibold mb-2 flex items-center gap-2.5 flex-wrap">
          {title}
          <span className="font-mono text-[11px] text-[#888888] bg-[#111111] px-2.5 py-0.5 rounded-md border border-[#222222]">{repo}</span>
        </h3>
        <p className="text-[13px] text-[#888888] leading-relaxed max-w-[480px]">
          {description}
        </p>
      </div>
      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 min-w-[120px] w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center">
          {members.map((m, i) => (
            <div key={i} className="w-7 h-7 rounded-full border-[2.5px] border-[#161616] flex items-center justify-center text-[10px] font-bold text-white -ml-2 first:ml-0 relative hover:z-10 hover:scale-110 transition-transform" style={{ backgroundColor: m.color }}>
              {m.initial}
            </div>
          ))}
        </div>
        <span className={`text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${status === 'Active' ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 before:w-1.5 before:h-1.5 before:bg-[#22c55e] before:rounded-full before:animate-pulse' : 'bg-[#555555]/15 text-[#555555] border border-[#222222]'}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function GuideStep({ step, title, desc, isLast }: { step: string, title: string, desc: string, isLast?: boolean }) {
  return (
    <div className={`relative pl-8 ${isLast ? '' : 'mb-6 pb-5 border-b border-[#222222]'} group`}>
      <div className="absolute left-0 top-0 w-6 h-6 bg-[#111111] border border-[#222222] rounded-full flex items-center justify-center text-[11px] font-bold text-[#555555] font-mono transition-colors group-hover:bg-[#22c55e]/10 group-hover:border-[#22c55e] group-hover:text-[#22c55e]">
        {step}
      </div>
      <h4 className="text-[14px] font-semibold mb-2 text-[#e8e8e8]">{title}</h4>
      <p className="text-[13px] text-[#888888] leading-relaxed">{desc}</p>
    </div>
  );
}
