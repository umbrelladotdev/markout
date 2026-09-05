import type { ExportProgress } from "../lib/export";

type Props = {
  progress: ExportProgress | null;
};

export function ExportProgressBar({ progress }: Props) {
  if (!progress) return null;
  const ratio = progress.total === 0 ? 1 : progress.current / progress.total;
  return (
    <div className="export-progress" role="status">
      <div className="export-progress-label">{progress.label}</div>
      <div className="export-progress-track">
        <div className="export-progress-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}
