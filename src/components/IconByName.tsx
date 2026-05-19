import { icons } from 'lucide-react';

interface IconByNameProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Convert kebab-case icon name (e.g. "book-open") to PascalCase key (e.g. "BookOpen") */
function toPascalCase(s: string): string {
  return s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export default function IconByName({ name, size = 24, className, strokeWidth }: IconByNameProps) {
  const key = toPascalCase(name) as keyof typeof icons;
  const Icon = icons[key] ?? icons[name as keyof typeof icons];
  if (!Icon) return null;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}
