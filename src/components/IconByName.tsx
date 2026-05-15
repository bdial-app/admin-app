import { icons } from 'lucide-react';

interface IconByNameProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function IconByName({ name, size = 24, className, strokeWidth }: IconByNameProps) {
  const Icon = icons[name as keyof typeof icons];
  if (!Icon) return null;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}
