import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { MermaidBlock } from './MermaidBlock';
import { DocFile } from '../../types';
import { FileText, Folder, ChevronDown, ChevronRight, RefreshCw, Layers } from 'lucide-react';

interface KnowledgeViewerProps {
  files: DocFile[];
  activeFilePath: string;
  onActiveFileChange: (path: string) => void;
  content: string;
  isLoadingContent: boolean;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  canSync: boolean;
}

export function KnowledgeViewer({
  files,
  activeFilePath,
  onActiveFileChange,
  content,
  isLoadingContent,
  onSync,
  isSyncing,
  canSync,
}: KnowledgeViewerProps) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // Extract headings from markdown text for the Table of Contents (ToC)
  useEffect(() => {
    const headingLines = content.split('\n').filter((line) => line.startsWith('## ') || line.startsWith('### '));
    const parsedHeadings = headingLines.map((line) => {
      const level = line.startsWith('## ') ? 2 : 3;
      const text = line.replace(/^#{2,3}\s+/, '').trim();
      // Generate standard markdown ID (lower case, replace spaces with hyphens)
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      return { id, text, level };
    });
    setHeadings(parsedHeadings);
  }, [content]);

  // Set up IntersectionObserver to track reading position and highlight active heading in ToC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          setActiveHeadingId(visibleEntry.target.id);
        }
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );

    // Observe all h2 and h3 elements inside markdown
    const mdContainer = document.querySelector('.markdown-prose');
    if (mdContainer) {
      const headings = mdContainer.querySelectorAll('h2, h3');
      headings.forEach((heading) => observer.observe(heading));
    }

    return () => observer.disconnect();
  }, [content, isLoadingContent]);

  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden font-sans bg-bg">
      
      {/* LEFT PANEL: FILE TREE */}
      <aside className="w-60 border-r border-border bg-[#0b0b0b] flex flex-col justify-between shrink-0">
        <div className="overflow-y-auto p-4 flex-1">
          <div className="text-[11px] text-text-muted font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Layers size={12} /> Project Files
          </div>
          <div className="space-y-0.5">
            {files.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                activePath={activeFilePath}
                onSelect={onActiveFileChange}
              />
            ))}
          </div>
        </div>

        {/* SYNC TRIGGER (For developers only) */}
        {canSync && (
          <div className="p-4 border-t border-border bg-[#0c0c0c]">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-bg-card border border-border hover:bg-bg-hover hover:border-border-hover disabled:opacity-50 transition-all text-xs font-semibold rounded-md text-text"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin text-accent' : 'text-text-secondary'} />
              {isSyncing ? 'Syncing Docs...' : 'Sync GitHub Docs'}
            </button>
          </div>
        )}
      </aside>

      {/* CENTER PANEL: MARKDOWN READER */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12 border-r border-border">
        {isLoadingContent ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
              <div className="text-xs text-text-muted font-mono">Fetching document contents...</div>
            </div>
          </div>
        ) : (
          <div className="max-w-[720px] mx-auto markdown-prose">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeSlug]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-bold tracking-tight text-text mb-6 border-b border-border pb-4 mt-0 font-sans" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold tracking-tight text-text mb-4 mt-8 font-sans scroll-mt-6" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-base font-semibold text-text mb-3 mt-6 font-sans scroll-mt-6" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-[14px] text-text-secondary leading-[1.7] mb-5 font-sans" {...props} />
                ),
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isMermaid = match && match[1] === 'mermaid';

                  if (isMermaid) {
                    return <MermaidBlock code={String(children).replace(/\n$/, '')} />;
                  }

                  // Non-mermaid code blocks
                  return (
                    <code 
                      className={`
                        font-mono text-xs px-1.5 py-0.5 rounded-sm bg-bg-card border border-border text-text
                        ${match ? 'block p-4 my-5 overflow-x-auto leading-relaxed' : ''}
                      `} 
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-6 border border-border rounded-xl">
                    <table className="w-full text-left border-collapse text-xs font-sans" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-bg-elevated border-b border-border font-semibold text-text" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="p-3 font-semibold" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="p-3 border-b border-border text-text-secondary" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a className="text-accent hover:underline decoration-accent/30 font-medium" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc pl-5 mb-5 space-y-2 text-[14px] text-text-secondary" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal pl-5 mb-5 space-y-2 text-[14px] text-text-secondary" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </main>

      {/* RIGHT PANEL: TABLE OF CONTENTS */}
      <aside className="w-56 overflow-y-auto p-6 hidden xl:block shrink-0 bg-bg">
        {headings.length > 0 && (
          <div>
            <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-4">On This Page</h4>
            <ul className="space-y-3 border-l border-border">
              {headings.map((heading) => (
                <li 
                  key={heading.id}
                  className={`
                    pl-3 border-l -ml-px
                    ${heading.level === 3 ? 'pl-6' : ''}
                    ${activeHeadingId === heading.id 
                      ? 'border-accent text-accent font-medium' 
                      : 'border-transparent text-text-secondary hover:text-text'
                    }
                  `}
                >
                  <button
                    onClick={() => handleHeadingClick(heading.id)}
                    className="text-left text-xs leading-normal transition-colors outline-none"
                  >
                    {heading.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

    </div>
  );
}

// Sub-component for file tree rendering (handles folders and files)
function FileTreeNode({
  node,
  activePath,
  onSelect,
}: {
  node: DocFile;
  activePath: string;
  onSelect: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isFile = node.type === 'file';
  const isActive = activePath === node.path;

  if (isFile) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`
          w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors text-left
          ${isActive 
            ? 'bg-accent/10 text-accent' 
            : 'text-text-secondary hover:text-text hover:bg-bg-card'
          }
        `}
      >
        <FileText size={14} className={isActive ? 'text-accent' : 'text-text-muted'} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  // Folder Node
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] font-medium text-text-secondary hover:text-text hover:bg-bg-card transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 truncate">
          <Folder size={14} className="text-text-muted" />
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />}
      </button>
      {isOpen && node.children && (
        <div className="pl-3.5 mt-0.5 border-l border-border/50 ml-4 space-y-0.5">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
