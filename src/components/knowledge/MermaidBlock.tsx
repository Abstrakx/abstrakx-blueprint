import { useEffect, useRef, useState } from 'react';
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

  if (error) {
    return (
      <div className="bg-bg-card border border-red-500/20 rounded-lg p-4 font-mono text-xs my-4 text-red-400">
        <div className="font-semibold mb-2">⚠️ Mermaid Rendering Error</div>
        <pre className="overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="bg-[#0f0f0f] border border-border rounded-xl p-6 my-6 flex justify-center overflow-x-auto shadow-inner"
      dangerouslySetInnerHTML={{ __html: svg || '<div class="text-xs text-text-muted animate-pulse">Rendering diagram...</div>' }}
    />
  );
}
