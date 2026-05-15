import { DynamicIcon } from "lucide-react/dynamic";

export const GRADIENT_PALETTE: Record<
  string,
  { gradient: string; label: string }
> = {
  amber: { gradient: "from-amber-400 to-orange-500", label: "Amber" },
  emerald: { gradient: "from-emerald-400 to-teal-500", label: "Emerald" },
  rose: { gradient: "from-rose-400 to-pink-500", label: "Rose" },
  blue: { gradient: "from-blue-400 to-indigo-500", label: "Blue" },
  violet: { gradient: "from-violet-400 to-purple-500", label: "Violet" },
  cyan: { gradient: "from-cyan-400 to-blue-500", label: "Cyan" },
  orange: { gradient: "from-orange-400 to-red-500", label: "Orange" },
  pink: { gradient: "from-pink-400 to-fuchsia-500", label: "Pink" },
  lime: { gradient: "from-lime-400 to-green-500", label: "Lime" },
  indigo: { gradient: "from-indigo-400 to-blue-600", label: "Indigo" },
  teal: { gradient: "from-teal-400 to-emerald-500", label: "Teal" },
  red: { gradient: "from-red-400 to-rose-600", label: "Red" },
  fuchsia: { gradient: "from-fuchsia-400 to-purple-600", label: "Fuchsia" },
  sky: { gradient: "from-sky-400 to-blue-500", label: "Sky" },
  yellow: { gradient: "from-yellow-400 to-amber-500", label: "Yellow" },
};

const PALETTE_KEYS = Object.keys(GRADIENT_PALETTE);

interface ColorPickerProps {
  value?: string | null;
  iconName?: string | null;
  onChange: (color: string) => void;
}

export default function ColorPicker({
  value,
  iconName,
  onChange,
}: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Icon Color
      </label>
      <div className="grid grid-cols-5 gap-2">
        {PALETTE_KEYS.map((key) => {
          const { gradient, label } = GRADIENT_PALETTE[key];
          const isSelected = value === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => onChange(key)}
              className={`relative w-full aspect-square rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                isSelected
                  ? "ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800"
                  : "ring-1 ring-black/5"
              }`}
            >
              {iconName ? (
                <DynamicIcon
                  // @ts-expect-error dynamic name
                  name={iconName}
                  size={16}
                  className="text-white drop-shadow-sm"
                  strokeWidth={2}
                />
              ) : (
                <span className="text-xs font-bold text-white/80">
                  {label[0]}
                </span>
              )}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
