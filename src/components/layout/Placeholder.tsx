/** Temporary body for routes whose spec is not implemented yet. */
export function Placeholder({ spec }: { spec: string }) {
  return <div className="empty-state">Widok w przygotowaniu ({spec}).</div>;
}
