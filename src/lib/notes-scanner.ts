import { CompiledNote } from '../types';

/**
 * Scans markdown content for "💡 NOTE: [content]" patterns.
 * Returns an array of CompiledNote objects.
 */
export function scanNotesFromMarkdown(content: string, filePath: string): CompiledNote[] {
  const notes: CompiledNote[] = [];
  const lines = content.split('\n');

  // Regex to look for "💡 NOTE:" or just "NOTE:" or similar
  const noteRegex = /(?:💡\s*)?NOTE:\s*(.+)/i;

  lines.forEach((line, index) => {
    const match = line.match(noteRegex);
    if (match) {
      notes.push({
        id: Math.random().toString(36).substr(2, 9),
        title: match[1].trim(),
        file_path: filePath,
        line_number: index + 1,
        author: 'Git Blame (Pending Sync)' // Placeholder or can parse git blame if available
      });
    }
  });

  return notes;
}
