const KEY = "markout.draft.v1";

export type Draft = {
  markdown: string;
  filePath: string | null;
  fileName: string;
  savedRevision: string | null;
  updatedAt: number;
};

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (typeof parsed.markdown !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Quota or private mode: the in-memory editor remains the source of truth.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
