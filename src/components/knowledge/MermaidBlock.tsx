import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Maximize2 } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid library
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: '#0a0a0a',
    primaryColor: '#22c55e',
    primaryTextColor: '#e8e8e8',
    primaryBorderColor: '#222222',
    lineColor: '#555555',
    secondaryColor: '#161616',
    tertiaryColor: '#111111',
  },
  securityLevel: 'loose',
});

interface MermaidBlockProps {
  code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const modalCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isModalOpen) return;

    const canvas = modalCanvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Mencegah halaman utama ikut ter-scroll
      
      const delta = -e.deltaY;
      const zoomFactor = 0.05; // Nilai step zoom yang smooth
      
      setScale((prevScale) => {
        if (delta > 0) {
          return Math.min(10, prevScale + zoomFactor);
        } else {
          return Math.max(0.15, prevScale - zoomFactor);
        }
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isModalOpen]);

  useEffect(() => {
    let active = true;
    const renderId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    const renderDiagram = async () => {
      try {
        setError(null);
        // Test compile syntax first
        const isValid = await mermaid.parse(code);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        const { svg: renderedSvg } = await mermaid.render(renderId, code);
        if (active) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (active) {
          setError(err.message || 'Error rendering Mermaid diagram');
        }
      }
    };

    renderDiagram();

    return () => {
      active = false;
      // Clean up the generated mermaid element from DOM if it got appended to body
      const element = document.getElementById(renderId);
      if (element) {
        element.remove();
      }
    };
  }, [code]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale((s) => Math.min(10, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.15, s - 0.25));
  const resetZoom = () => {
    setScale(4);
    setPanOffset({ x: 0, y: 0 });
  };

  if (error) {
    return (
      <div className="bg-bg-card border border-red-500/20 rounded-lg p-4 font-mono text-xs my-4 text-red-400">
        <div className="font-semibold mb-2">⚠️ Mermaid Rendering Error</div>
        <pre className="overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  return (
    <>
      {/* 1. Base Diagram Render Container (In-Page) */}
      <div
        ref={containerRef}
        onClick={() => {
          resetZoom();
          setIsModalOpen(true);
        }}
        className="bg-[#0f0f0f] border border-border rounded-xl p-6 my-6 flex justify-center items-center overflow-x-auto shadow-inner relative group cursor-pointer hover:border-border-hover transition-all"
      >
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg border border-border text-text text-[11px] font-medium rounded-lg shadow-lg">
            <Maximize2 size={12} className="text-accent" />
            <span>Click to expand & zoom</span>
          </div>
        </div>
        <div
          className="w-full flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg || '<div class="text-xs text-text-muted animate-pulse">Rendering diagram...</div>' }}
        />
      </div>

      {/* 2. Interactive Zoom & Pan Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#070707]/90 backdrop-blur-md flex flex-col items-center justify-center select-none animate-fade-in">

          {/* Header Controls bar */}
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-[#121212] border border-border rounded-xl p-1.5 shadow-2xl z-20">
            <button
              onClick={zoomOut}
              className="p-2 text-text-secondary hover:text-text hover:bg-bg-card rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-[11px] font-mono text-text-secondary w-14 text-center select-none font-bold">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 text-text-secondary hover:text-text hover:bg-bg-card rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={resetZoom}
              className="p-2 text-text-secondary hover:text-accent hover:bg-bg-card rounded-lg transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 text-text-secondary hover:text-red-400 hover:bg-bg-card rounded-lg transition-colors"
              title="Close Modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Interactive Panning Canvas Container */}
          <div
            ref={modalCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`w-full h-full overflow-hidden flex items-center justify-center relative p-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
          >
            {/* The Scaled SVG Diagram Element */}
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-full flex items-center justify-center pointer-events-none select-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          {/* Footer Guide tooltip */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#121212]/80 border border-border/50 text-[10px] text-text-muted rounded-full pointer-events-none font-sans tracking-wide">
            💡 Drag to Pan diagram · Scroll with trackpad to zoom in/out
          </div>
        </div>
      )}
    </>
  );
}
