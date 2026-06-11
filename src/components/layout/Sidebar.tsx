import { LayoutDashboard, BookOpen, Lightbulb, CheckSquare, ArrowLeft, GitFork, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TeamMember } from '../../types';

type ViewMode = 'overview' | 'knowledge' | 'notes' | 'tasks';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  projectName: string;
  repoName: string;
  teamMembers?: TeamMember[];
}

export function Sidebar({ currentView, onViewChange, projectName, repoName, teamMembers = [] }: SidebarProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: LayoutDashboard },
    { id: 'knowledge' as ViewMode, label: 'Knowledge Base', icon: BookOpen },
    { id: 'notes' as ViewMode, label: '💡 Notes Compiler', icon: Lightbulb },
    { id: 'tasks' as ViewMode, label: 'Task Board', icon: CheckSquare },
  ];

  return (
    <aside className="w-64 bg-bg-elevated border-r border-border h-screen flex flex-col justify-between shrink-0 font-sans">
      <div>
        {/* BACK TO DASHBOARD */}
        <div className="p-4 border-b border-border">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>

        {/* BRAND / PROJECT HEADER */}
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-5 h-5 bg-accent rounded-md flex items-center justify-center font-bold text-bg text-[10px]">
              P
            </div>
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-text-muted">Workspace</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-text truncate">{projectName}</h2>
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
                    : 'text-text-secondary hover:text-text hover:bg-bg-card'
                  }
                `}
              >
                <Icon size={16} className={isActive ? 'text-accent' : 'text-text-secondary'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* TEAM SECTION */}
        <div className="mt-8 px-6">
          <div className="flex items-center gap-2 text-text-muted text-[11px] font-bold uppercase tracking-wider mb-4">
            <Users size={12} /> Team Members
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
            {teamMembers.length === 0 ? (
              <div className="text-[11px] text-text-muted italic">No team members added</div>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-bg shrink-0"
                    style={{ backgroundColor: member.avatar_color || '#22c55e' }}
                  >
                    {member.name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-text leading-none mb-1 truncate">{member.name}</div>
                    <div className="text-[10px] text-text-muted leading-none capitalize">{member.role}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER - REPO INFO */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between p-3 bg-bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 truncate">
            <GitFork size={14} className="text-text-secondary shrink-0" />
            <div className="truncate">
              <div className="text-[11px] text-text-muted font-semibold uppercase leading-none mb-1">Git Repository</div>
              <div className="text-[12px] font-mono text-text-secondary leading-none truncate">{repoName}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

