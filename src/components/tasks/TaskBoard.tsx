import { useState } from 'react';
import { Task } from '../../types';
import { Plus, Check, Trash2, ClipboardList } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface TaskBoardProps {
  tasks: Task[];
  onToggleTask: (id: string, done: boolean) => Promise<void>;
  onAddTask: (text: string, assignee: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  userRole: 'owner' | 'developer' | 'viewer';
}

export function TaskBoard({ tasks, onToggleTask, onAddTask, onDeleteTask, userRole }: TaskBoardProps) {
  const { showToast } = useToast();
  const [activeInputColumn, setActiveInputColumn] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  const columns = [
    { name: 'Iqbal', avatarColor: 'bg-emerald-500' },
    { name: 'Syaiful', avatarColor: 'bg-blue-500' },
    { name: 'Hendra', avatarColor: 'bg-amber-500' },
  ];

  const isReadOnly = userRole === 'viewer';

  const handleAddTaskSubmit = async (assignee: string) => {
    if (!newTaskText.trim()) return;
    try {
      await onAddTask(newTaskText.trim(), assignee);
      setNewTaskText('');
      setActiveInputColumn(null);
      showToast('Task added successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add task', 'warning');
    }
  };

  return (
    <div className="flex-1 overflow-x-auto p-8 md:p-10 bg-[#0a0a0a] font-sans">
      <div className="min-w-[900px] max-w-[1200px] mx-auto h-full flex flex-col">
        
        {/* HEADER */}
        <div className="mb-10 pb-6 border-b border-[#222222]">
          <h1 className="text-2xl font-bold tracking-tight text-[#e8e8e8] mb-2 flex items-center gap-3">
            <ClipboardList className="text-accent" size={24} /> Split Task Board
          </h1>
          <p className="text-[#888888] text-sm leading-relaxed">
            Pembagian tugas spesifik antar-anggota tim dev. {isReadOnly ? 'Mode view-only diaktifkan untuk client.' : 'Setiap perubahan checkbox tersinkronisasi realtime.'}
          </p>
        </div>

        {/* COLUMNS */}
        <div className="grid grid-cols-3 gap-6 items-start flex-1">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.assignee === col.name);
            const doneCount = colTasks.filter((t) => t.done).length;

            return (
              <div 
                key={col.name}
                className="bg-[#111111] border border-[#222222] rounded-xl flex flex-col overflow-hidden max-h-[600px] shadow-lg"
              >
                
                {/* COLUMN HEADER */}
                <div className="p-4 bg-[#161616] border-b border-[#222222] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-[#0a0a0a] ${col.avatarColor}`}>
                      {col.name[0]}
                    </div>
                    <div>
                      <h3 className="text-[13px] font-bold text-[#e8e8e8] leading-none mb-0.5">{col.name}</h3>
                      <p className="text-[10px] text-[#555555] font-mono leading-none">Team Member</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#111111] text-[#888888] border border-[#222222]">
                    {doneCount}/{colTasks.length}
                  </span>
                </div>

                {/* TASK ITEMS LIST */}
                <div className="p-4 overflow-y-auto flex-1 space-y-2 min-h-[150px]">
                  {colTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-[#222222] rounded-lg flex flex-col justify-center items-center text-center p-4">
                      <p className="text-[11px] text-[#555555]">No tasks assigned</p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div 
                        key={task.id}
                        className={`
                          group/item bg-[#161616] border border-[#222222] rounded-lg p-3.5 flex items-start justify-between gap-3 hover:border-[#333333] transition-all
                          ${task.done ? 'opacity-60' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* CHECKBOX */}
                          <button
                            disabled={isReadOnly}
                            onClick={() => onToggleTask(task.id, !task.done)}
                            className={`
                              w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all
                              ${task.done 
                                ? 'bg-accent border-accent text-[#0a0a0a]' 
                                : 'border-[#333333] hover:border-accent/60 bg-transparent'
                              }
                            `}
                          >
                            {task.done && <Check size={11} strokeWidth={3} />}
                          </button>

                          {/* TEXT */}
                          <span 
                            className={`
                              text-[13px] leading-snug wrap-break-word
                              ${task.done ? 'line-through text-[#555555] font-medium' : 'text-[#e8e8e8]'}
                            `}
                          >
                            {task.text}
                          </span>
                        </div>

                        {/* DELETE BUTTON (Dev/Owner only) */}
                        {!isReadOnly && (
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="text-[#555555] hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                      </div>
                    ))
                  )}
                </div>

                {/* INPUT FIELD OR ADD BUTTON */}
                {!isReadOnly && (
                  <div className="p-3 bg-[#131313] border-t border-[#222222]">
                    {activeInputColumn === col.name ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTaskSubmit(col.name)}
                          placeholder="Type task description..."
                          autoFocus
                          className="w-full bg-[#0a0a0a] border border-[#222222] rounded px-3 py-2 text-xs focus:border-accent outline-none text-[#e8e8e8]"
                        />
                        <div className="flex justify-end gap-2 text-[10px] font-semibold">
                          <button 
                            onClick={() => setActiveInputColumn(null)} 
                            className="px-2.5 py-1.5 bg-[#161616] text-[#888888] rounded border border-[#222222] hover:bg-[#1c1c1c]"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleAddTaskSubmit(col.name)} 
                            className="px-2.5 py-1.5 bg-accent text-[#0a0a0a] rounded hover:opacity-90"
                          >
                            Add Task
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveInputColumn(col.name)}
                        className="w-full py-2 border border-dashed border-[#222222] hover:border-accent/40 rounded-lg text-xs font-semibold text-[#555555] hover:text-accent transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={12} /> Add Task
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
