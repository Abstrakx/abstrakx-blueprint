import { LayoutDashboard, BookOpen, Lightbulb, CheckSquare, ArrowLeft, GitFork, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'overview' | 'knowledge' | 'notes' | 'tasks';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  projectName: string;
  repoName: string;
}

export function Sidebar({ currentView, onViewChange, projectName, repoName }: SidebarProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: LayoutDashboard },
    { id: 'knowledge' as ViewMode, label: 'Knowledge Base', icon: BookOpen },
    { id: 'notes' as ViewMode, label: '💡 Notes Compiler', icon: Lightbulb },
    { id: 'tasks' as ViewMode, label: 'Task Board', icon: CheckSquare },
  ];

  const team = [
    { name: 'Iqbal', role: 'Owner', color: 'bg-emerald-500' },
    { name: 'Syaiful', role: 'Developer', color: 'bg-blue-500' },
    { name: 'Hendra', role: 'Developer', color: 'bg-amber-500' },
  ];

  return (
    <aside className="w-64 bg-[#111111] border-r border-[#222222] h-screen flex flex-col justify-between shrink-0 font-sans">
      <div>
        {/* BACK TO DASHBOARD */}
        <div className="p-4 border-b border-[#222222]">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>

        {/* BRAND / PROJECT HEADER */}
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-5 h-5 bg-[#22c55e] rounded-md flex items-center justify-center font-bold text-[#0a0a0a] text-[10px]">
              P
            </div>
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#555555]">Workspace</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-[#e8e8e8] truncate">{projectName}</h2>
        </div>

        {/* NAVIGATION */}
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-accent/10 text-accent' 
                    : 'text-[#888888] hover:text-[#e8e8e8] hover:bg-[#161616]'
                  }
                `}
              >
                <Icon size={16} className={isActive ? 'text-accent' : 'text-[#888888]'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* TEAM SECTION */}
        <div className="mt-8 px-6">
          <div className="flex items-center gap-2 text-[#555555] text-[11px] font-bold uppercase tracking-wider mb-4">
            <Users size={12} /> Team Members
          </div>
          <div className="space-y-3">
            {team.map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0a0a0a] ${member.color}`}>
                  {member.name[0]}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[#e8e8e8] leading-none mb-0.5">{member.name}</div>
                  <div className="text-[10px] text-[#555555] leading-none">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER - REPO INFO */}
      <div className="p-4 border-t border-[#222222]">
        <div className="flex items-center justify-between p-3 bg-[#161616] border border-[#222222] rounded-lg">
          <div className="flex items-center gap-2 truncate">
            <GitFork size={14} className="text-[#888888] shrink-0" />
            <div className="truncate">
              <div className="text-[11px] text-[#555555] font-semibold uppercase leading-none mb-1">Git Repository</div>
              <div className="text-[12px] font-mono text-[#888888] leading-none truncate">{repoName}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
