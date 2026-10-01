/** Thin wrappers over the global `.skeleton` utility so loading states never jump. */
export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function SkeletonRows({ rows = 5, height = 'h-12' }: { rows?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-2" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton w-full ${height}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5 flex flex-col gap-3" aria-busy>
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-32" />
      {Array.from({ length: Math.max(0, lines - 2) }).map((_, i) => (
        <div key={i} className="skeleton h-3 w-full" />
      ))}
    </div>
  );
}
