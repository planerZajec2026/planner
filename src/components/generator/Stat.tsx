export function Stat({ wartosc, etykieta }: { wartosc: string; etykieta: string }) {
  return (
    <div className="summary-stat">
      <span>{etykieta}</span>
      <strong style={{ fontSize: 20, color: "var(--ink)" }}>{wartosc}</strong>
    </div>
  );
}
