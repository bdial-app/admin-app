import { useState, useMemo, useCallback } from "react";
import { icons, type LucideIcon } from "lucide-react";
import { Search, X } from "lucide-react";

interface LucideIconPickerProps {
  value?: string | null;
  onChange: (iconName: string) => void;
  onClose: () => void;
}

const ICON_ENTRIES = Object.entries(icons) as [string, LucideIcon][];

export default function LucideIconPicker({
  value,
  onChange,
  onClose,
}: LucideIconPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_ENTRIES.slice(0, 200);
    const q = search.toLowerCase().replace(/[^a-z0-9]/g, "");
    return ICON_ENTRIES.filter(([name]) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(q),
    ).slice(0, 200);
  }, [search]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      onClose();
    },
    [onChange, onClose],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Choose Icon
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons... (e.g. home, scissors, camera)"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 placeholder:text-slate-400 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">
              No icons matching &ldquo;{search}&rdquo;
            </p>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filtered.map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  title={name}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:scale-90 ${
                    value === name
                      ? "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-400"
                      : ""
                  }`}
                >
                  <Icon size={18} className="text-slate-700 dark:text-slate-200" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {value && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="text-xs text-slate-400">Selected:</span>
            <code className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-300">
              {value}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
