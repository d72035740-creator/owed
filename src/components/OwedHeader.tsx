export function OwedHeader({ onRestart, disabled }: { onRestart(): void; disabled: boolean }) {
  return (
    <header className="owed-header">
      <a className="wordmark" href="#top" aria-label="OWED home">
        OWED
      </a>
      <p className="prototype-label">Synthetic civic-tech prototype</p>
      <button className="restart-button" type="button" onClick={onRestart} disabled={disabled}>
        Restart demo
      </button>
    </header>
  );
}
