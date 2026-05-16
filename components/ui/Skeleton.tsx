export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-container">
      <table className="table">
        <thead className="table-header">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="table-header-cell">
                <div className="skeleton h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="table-cell">
                  <div className={`skeleton h-3 ${c === 0 ? 'w-32' : 'w-20'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card-glass p-6 space-y-4">
      <div className="skeleton h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3 w-full" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function SkeletonRiderField() {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-full" />
      </div>
    </div>
  );
}
