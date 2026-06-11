import { CompiledNote } from '../../types';
import { Lightbulb, FileText, User, Tag } from 'lucide-react';

interface NotesCompilerProps {
  notes: CompiledNote[];
  onNoteClick: (filePath: string) => void;
  isLoading: boolean;
}

export function NotesCompiler({ notes, onNoteClick, isLoading }: NotesCompilerProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <div className="text-xs text-text-muted font-mono">Aggregating tag items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-bg font-sans">
      <div className="max-w-[800px] mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 pb-6 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-text mb-2 flex items-center gap-3">
            <Lightbulb className="text-accent animate-pulse" size={24} /> Global Notes Compiler
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Auto-compiler yang mengumpulkan semua baris bertanda <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg-card text-text border border-border">💡 NOTE:</code> di dalam seluruh dokumen Git kamu secara otomatis.
          </p>
        </div>

        {/* NOTES LIST */}
        {notes.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center bg-[#0d0d0d]">
            <Lightbulb size={32} className="text-text-muted mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-text mb-1">No notes compiled yet</h3>
            <p className="text-xs text-text-muted max-w-[320px] mx-auto">
              Tambahkan penanda <code className="font-mono text-[10px]">💡 NOTE: [pesan]</code> ke dalam file markdown dokumentasimu untuk menampilkannya di sini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notes.map((note) => (
              <div 
                key={note.id}
                onClick={() => onNoteClick(note.file_path)}
                className="group bg-bg-elevated border border-border rounded-xl p-5 hover:bg-bg-card hover:border-accent/40 hover:-translate-y-px transition-all duration-200 cursor-pointer relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex gap-4">
                  
                  {/* ICON BLOCK */}
                  <div className="w-10 h-10 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0">
                    <Tag size={16} className="text-accent" />
                  </div>

                  {/* CONTENT BLOCK */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-text leading-snug mb-3 group-hover:text-accent transition-colors wrap-break-word">
                      {note.title}
                    </h4>

                    {/* METADATA STRIP */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-text-muted font-medium font-mono">
                      <div className="flex items-center gap-1.5 hover:text-text-secondary transition-colors">
                        <FileText size={12} />
                        <span className="truncate">{note.file_path.split('/').pop()} (Line {note.line_number})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={12} />
                        <span>{note.author || 'System Sync'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
