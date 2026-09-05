import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { ExportProgressBar } from "./components/ExportProgressBar";
import { Preview } from "./components/Preview";
import { StatusBar } from "./components/StatusBar";
import { Toasts, type ToastMessage } from "./components/Toasts";
import { Toolbar } from "./components/Toolbar";
import { loadDraft, saveDraft } from "./lib/autosave";
import {
  blocksToPreviewHtml,
  ExportBlockedError,
  excerpt,
  parseDocument,
  suggestedExportName,
  type MermaidIssue,
} from "./lib/document";
import { exportDocument, formatIssueList, type ExportFormat, type ExportProgress } from "./lib/export";
import { collectMermaidIssues } from "./lib/mermaid";
import {
  confirmDiscard,
  downloadBytes,
  downloadText,
  isTauri,
  openInOs,
  pickBrowserMarkdown,
  pickOpenMarkdown,
  pickSaveExport,
  pickSaveMarkdown,
  readTextFile,
  setWindowTitle,
  writeBinaryFile,
  writeTextFile,
} from "./lib/native";
import { WELCOME_MARKDOWN } from "./lib/welcome";

function fileNameOf(path: string | null, fallback = "brouillon.md"): string {
  if (!path) return fallback;
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || fallback;
}

export default function App() {
  const draft = useMemo(() => loadDraft(), []);
  const [markdown, setMarkdown] = useState(draft?.markdown ?? WELCOME_MARKDOWN);
  const [filePath, setFilePath] = useState<string | null>(draft?.filePath ?? null);
  const [fileName, setFileName] = useState(draft?.fileName ?? "brouillon.md");
  const [savedRevision, setSavedRevision] = useState<string | null>(
    draft?.savedRevision ?? (draft ? null : WELCOME_MARKDOWN),
  );
  const [debounced, setDebounced] = useState(markdown);
  const [view, setView] = useState<"split" | "editor" | "preview">("split");
  const [split, setSplit] = useState(50);
  const [issues, setIssues] = useState<MermaidIssue[]>([]);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(1);
  const dragging = useRef(false);

  const dirty = markdown !== (savedRevision ?? "");
  const parsed = useMemo(() => parseDocument(debounced), [debounced]);
  const previewHtml = useMemo(() => blocksToPreviewHtml(parsed.blocks), [parsed]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(markdown), 180);
    return () => window.clearTimeout(handle);
  }, [markdown]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      saveDraft({
        markdown,
        filePath,
        fileName,
        savedRevision,
        updatedAt: Date.now(),
      });
    }, 700);
    return () => window.clearTimeout(handle);
  }, [markdown, filePath, fileName, savedRevision]);

  useEffect(() => {
    let cancelled = false;
    void collectMermaidIssues(parsed.mermaid).then((next) => {
      if (!cancelled) setIssues(next);
    });
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  useEffect(() => {
    const title = dirty ? `Markout — ${fileName} •` : `Markout — ${fileName}`;
    void setWindowTitle(title);
  }, [fileName, dirty]);

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = toastId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 7000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const loadMarkdown = useCallback((contents: string, path: string | null, name: string) => {
    setMarkdown(contents);
    setDebounced(contents);
    setFilePath(path);
    setFileName(name);
    setSavedRevision(contents);
  }, []);

  const onNew = useCallback(async () => {
    if (dirty) {
      const ok = await confirmDiscard("Le document n’est pas enregistré. Créer un nouveau fichier ?");
      if (!ok) return;
    }
    loadMarkdown("# Nouveau document\n\n", null, "brouillon.md");
  }, [dirty, loadMarkdown]);

  const onOpen = useCallback(async () => {
    if (dirty) {
      const ok = await confirmDiscard("Le document n’est pas enregistré. Ouvrir un autre fichier ?");
      if (!ok) return;
    }
    try {
      if (isTauri()) {
        const path = await pickOpenMarkdown();
        if (!path) return;
        const contents = await readTextFile(path);
        loadMarkdown(contents, path, fileNameOf(path));
      } else {
        const picked = await pickBrowserMarkdown();
        if (!picked) return;
        loadMarkdown(picked.contents, null, picked.name);
      }
    } catch (error) {
      pushToast({
        kind: "error",
        title: "Ouverture impossible",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [dirty, loadMarkdown, pushToast]);

  const onSave = useCallback(async () => {
    try {
      if (isTauri()) {
        let path = filePath;
        if (!path) {
          path = await pickSaveMarkdown(fileName);
          if (!path) return;
        }
        await writeTextFile(path, markdown);
        setFilePath(path);
        setFileName(fileNameOf(path));
        setSavedRevision(markdown);
        pushToast({ kind: "success", title: "Fichier enregistré", detail: fileNameOf(path) });
      } else {
        downloadText(fileName.endsWith(".md") ? fileName : `${fileName}.md`, markdown);
        setSavedRevision(markdown);
        pushToast({ kind: "success", title: "Téléchargement Markdown", detail: fileName });
      }
    } catch (error) {
      pushToast({
        kind: "error",
        title: "Enregistrement impossible",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [fileName, filePath, markdown, pushToast]);

  const runExport = useCallback(
    async (format: ExportFormat) => {
      if (issues.length > 0) {
        pushToast({
          kind: "error",
          title: "Export bloqué",
          detail: formatIssueList(issues),
        });
        return;
      }
      try {
        const result = await exportDocument(markdown, format, setProgress);
        const suggested = suggestedExportName(markdown, format);
        if (isTauri()) {
          const path = await pickSaveExport(suggested, format);
          if (!path) {
            setProgress(null);
            return;
          }
          await writeBinaryFile(path, result.bytes);
          pushToast({
            kind: "success",
            title: format === "pdf" ? "PDF exporté" : "Document Word exporté",
            detail:
              format === "docx"
                ? "Ouvrez le fichier dans Word et appuyez sur F9 pour actualiser la table des matières."
                : path,
            actionLabel: "Ouvrir le fichier",
            onAction: () => {
              void openInOs(path);
            },
          });
        } else {
          downloadBytes(
            suggested,
            result.bytes,
            format === "pdf"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );
          pushToast({
            kind: "success",
            title: format === "pdf" ? "PDF téléchargé" : "Document Word téléchargé",
            detail:
              format === "docx"
                ? "Dans Word, cliquez la table des matières puis F9 pour mettre à jour les champs."
                : suggested,
          });
        }
      } catch (error) {
        if (error instanceof ExportBlockedError) {
          setIssues(error.issues);
          pushToast({
            kind: "error",
            title: error.message,
            detail: error.issues
              .map((issue) => `Diagramme ${issue.index} : ${issue.message} (${excerpt(issue.source, 80)})`)
              .join("\n"),
          });
        } else {
          pushToast({
            kind: "error",
            title: "Export impossible",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        setProgress(null);
      }
    },
    [issues, markdown, pushToast],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        void onNew();
      } else if (key === "o") {
        event.preventDefault();
        void onOpen();
      } else if (key === "s") {
        event.preventDefault();
        void onSave();
      } else if (key === "e" && event.shiftKey) {
        event.preventDefault();
        void runExport("docx");
      } else if (key === "e") {
        event.preventDefault();
        void runExport("pdf");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNew, onOpen, onSave, runExport]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const ratio = (event.clientX / window.innerWidth) * 100;
      setSplit(Math.min(72, Math.max(28, ratio)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const status =
    progress?.label ??
    (issues.length > 0
      ? `${issues.length} diagramme${issues.length > 1 ? "s" : ""} à corriger`
      : dirty
        ? "Brouillon enregistré localement"
        : "Document à jour");

  return (
    <div className={`app view-${view}`}>
      <Toolbar
        fileLabel={fileName}
        dirty={dirty}
        exporting={progress !== null}
        mermaidErrors={issues.length}
        onNew={() => void onNew()}
        onOpen={() => void onOpen()}
        onSave={() => void onSave()}
        onExportPdf={() => void runExport("pdf")}
        onExportDocx={() => void runExport("docx")}
        view={view}
        onView={setView}
      />
      <ExportProgressBar progress={progress} />
      <main className="workspace">
        <section className="pane editor-pane" style={{ flexBasis: view === "split" ? `${split}%` : undefined }}>
          <Editor value={markdown} onChange={setMarkdown} />
        </section>
        {view === "split" ? (
          <button
            type="button"
            className="splitter"
            aria-label="Redimensionner le panneau"
            onPointerDown={() => {
              dragging.current = true;
            }}
          />
        ) : null}
        <section className="pane preview-pane" style={{ flexBasis: view === "split" ? `${100 - split}%` : undefined }}>
          <Preview html={previewHtml} mermaidBlocks={parsed.mermaid} />
        </section>
      </main>
      <StatusBar words={parsed.wordCount} diagrams={parsed.mermaid.length} errors={issues.length} status={status} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
