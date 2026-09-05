type Props = {
  words: number;
  diagrams: number;
  errors: number;
  status: string;
};

export function StatusBar({ words, diagrams, errors, status }: Props) {
  return (
    <footer className="statusbar">
      <span>{status}</span>
      <span className="grow" />
      <span>{words} mot{words > 1 ? "s" : ""}</span>
      <span>
        {diagrams} diagramme{diagrams > 1 ? "s" : ""}
      </span>
      {errors > 0 ? <span className="status-error">Export bloqué</span> : <span>Prêt</span>}
    </footer>
  );
}
