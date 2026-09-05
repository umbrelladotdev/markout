type Props = {
  fileLabel: string;
  dirty: boolean;
  exporting: boolean;
  mermaidErrors: number;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  view: "split" | "editor" | "preview";
  onView: (view: "split" | "editor" | "preview") => void;
};

export function Toolbar({
  fileLabel,
  dirty,
  exporting,
  mermaidErrors,
  onNew,
  onOpen,
  onSave,
  onExportPdf,
  onExportDocx,
  view,
  onView,
}: Props) {
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="mark" aria-hidden="true">
          M
        </span>
        <div>
          <div className="brand-name">Markout</div>
          <div className="file-label">
            {fileLabel}
            {dirty ? " • modifié" : ""}
          </div>
        </div>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={onNew} title="Nouveau (Ctrl+N)">
          Nouveau
        </button>
        <button type="button" onClick={onOpen} title="Ouvrir (Ctrl+O)">
          Ouvrir
        </button>
        <button type="button" onClick={onSave} title="Enregistrer (Ctrl+S)">
          Enregistrer
        </button>
      </div>

      <div className="toolbar-group view-toggle" role="group" aria-label="Affichage">
        <button type="button" className={view === "editor" ? "active" : ""} onClick={() => onView("editor")}>
          Éditeur
        </button>
        <button type="button" className={view === "split" ? "active" : ""} onClick={() => onView("split")}>
          Split
        </button>
        <button type="button" className={view === "preview" ? "active" : ""} onClick={() => onView("preview")}>
          Aperçu
        </button>
      </div>

      <div className="toolbar-group toolbar-export">
        {mermaidErrors > 0 ? (
          <span className="export-block-hint">
            {mermaidErrors} diagramme{mermaidErrors > 1 ? "s" : ""} invalide{mermaidErrors > 1 ? "s" : ""}
          </span>
        ) : null}
        <button type="button" className="primary" disabled={exporting} onClick={onExportPdf} title="Exporter PDF">
          Exporter PDF
        </button>
        <button type="button" className="primary" disabled={exporting} onClick={onExportDocx} title="Exporter Word">
          Exporter Word
        </button>
      </div>
    </header>
  );
}
