export type ToastKind = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <div>
            <strong>{toast.title}</strong>
            {toast.detail ? <p>{toast.detail}</p> : null}
            {toast.actionLabel && toast.onAction ? (
              <button type="button" onClick={toast.onAction}>
                {toast.actionLabel}
              </button>
            ) : null}
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fermer">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
