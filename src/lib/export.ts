import { ExportBlockedError, parseDocument, type MermaidIssue } from "./document";
import {
  collectMermaidIssues,
  renderDiagramForExport,
  type RenderedDiagram,
} from "./mermaid";

export type ExportFormat = "pdf" | "docx";

export type ExportProgress = {
  phase: "validate" | "diagrams" | "build";
  current: number;
  total: number;
  label: string;
};

export type ExportResult = {
  bytes: Uint8Array;
  format: ExportFormat;
  title: string | null;
  diagramCount: number;
};

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function prepareExport(
  markdown: string,
  onProgress?: (progress: ExportProgress) => void,
): Promise<{
  parsed: ReturnType<typeof parseDocument>;
  diagrams: Map<string, RenderedDiagram>;
}> {
  onProgress?.({ phase: "validate", current: 0, total: 1, label: "Analyse du document…" });
  const parsed = parseDocument(markdown);
  const issues = await collectMermaidIssues(parsed.mermaid);
  if (issues.length > 0) {
    throw new ExportBlockedError(issues);
  }

  const diagrams = new Map<string, RenderedDiagram>();
  const total = parsed.mermaid.length;
  for (let i = 0; i < parsed.mermaid.length; i++) {
    const block = parsed.mermaid[i];
    onProgress?.({
      phase: "diagrams",
      current: i + 1,
      total,
      label: total ? `Rendu des diagrammes… ${i + 1}/${total}` : "Aucun diagramme",
    });
    const rendered = await renderDiagramForExport(block.index, block.source, block.hash);
    diagrams.set(block.hash, rendered);
    await yieldToUi();
  }
  return { parsed, diagrams };
}

export async function exportDocument(
  markdown: string,
  format: ExportFormat,
  onProgress?: (progress: ExportProgress) => void,
): Promise<ExportResult> {
  const { parsed, diagrams } = await prepareExport(markdown, onProgress);
  onProgress?.({
    phase: "build",
    current: 1,
    total: 1,
    label: format === "pdf" ? "Génération du PDF…" : "Génération du document Word…",
  });
  const bytes =
    format === "pdf"
      ? await (await import("./export-pdf")).buildPdf(parsed.blocks, diagrams, parsed.title)
      : await (await import("./export-docx")).buildDocx(parsed.blocks, diagrams, parsed.title);
  return {
    bytes,
    format,
    title: parsed.title,
    diagramCount: diagrams.size,
  };
}

export function formatIssueList(issues: MermaidIssue[]): string {
  return issues
    .map((issue) => `Diagramme ${issue.index} : ${issue.message}`)
    .join("\n");
}
