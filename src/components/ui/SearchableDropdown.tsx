import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2, Lock, Globe } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  details?: string;
  isPrivate?: boolean;
}

interface SearchableDropdownProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SearchableDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  isLoading = false,
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync searchQuery with selection if closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opt.details && opt.details.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative font-sans text-text text-sm" ref={containerRef}>
      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.5px] mb-1.5">
        {label}
      </label>
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full bg-bg border rounded-md px-3 py-2 text-xs cursor-pointer select-none transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-border-hover'}
          ${isOpen ? 'border-accent ring-1 ring-accent/30' : ''}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          ) : selectedOption ? (
            <>
              {selectedOption.isPrivate !== undefined && (
                selectedOption.isPrivate ? (
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 text-text-muted shrink-0" />
                )
              )}
              <span className="text-text truncate">{selectedOption.label}</span>
              {selectedOption.details && (
                <span className="text-text-muted text-[10px] truncate">({selectedOption.details})</span>
              )}
            </>
          ) : (
            <span className="text-text-secondary">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* DROPDOWN MENU */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
          {/* Search bar inside dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg">
            <Search size={12} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter list..."
              autoFocus
              className="w-full bg-transparent border-none outline-none text-xs text-text placeholder-text-muted p-0"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="max-h-[220px] overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-text-secondary gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                Fetching details...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                No items matching filter
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`
                      flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors
                      ${isSelected ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-bg-hover text-text'}
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.isPrivate !== undefined && (
                        opt.isPrivate ? (
                          <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-text-muted shrink-0" />
                        )
                      )}
                      <div className="truncate">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.details && (
                          <div className="text-[10px] text-text-secondary truncate mt-0.5">{opt.details}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={12} className="text-accent shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
