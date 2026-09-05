import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ExportBlockedError,
  blocksToPreviewHtml,
  parseDocument,
  suggestedExportName,
} from "./document";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

function load(name: string): string {
  return readFileSync(join(fixtures, name), "utf8");
}

describe("parseDocument", () => {
  it("extrait titres, tableau, listes et chaque type Mermaid du MVP", () => {
    const parsed = parseDocument(load("acceptance.md"));
    expect(parsed.title).toBe("Markout — document d’acceptance MVP");
    expect(parsed.headings.some((h) => h.text === "4. Flowchart")).toBe(true);
    expect(parsed.blocks.some((b) => b.type === "table")).toBe(true);
    expect(parsed.blocks.some((b) => b.type === "list")).toBe(true);
    expect(parsed.mermaid).toHaveLength(6);
    const sources = parsed.mermaid.map((m) => m.source).join("\n");
    expect(sources).toMatch(/flowchart/);
    expect(sources).toMatch(/stateDiagram-v2/);
    expect(sources).toMatch(/mindmap/);
    expect(sources).toMatch(/pie /);
    expect(sources).toMatch(/gantt/);
    expect(sources).toMatch(/timeline/);
  });

  it("ne laisse pas les fences mermaid comme blocs de code", () => {
    const parsed = parseDocument(load("acceptance.md"));
    const code = parsed.blocks.filter((b) => b.type === "code");
    expect(code.every((b) => b.type === "code" && b.lang !== "mermaid")).toBe(true);
  });

  it("génère un aperçu avec des slots mermaid plutôt que le source brut", () => {
    const parsed = parseDocument(load("acceptance.md"));
    const html = blocksToPreviewHtml(parsed.blocks);
    expect(html).toContain('class="mermaid-slot"');
    expect(html).not.toContain("```mermaid");
    expect(html).toContain("<table>");
  });

  it("compte le diagramme invalide pour le blocage d’export", () => {
    const parsed = parseDocument(load("invalid-mermaid.md"));
    expect(parsed.mermaid).toHaveLength(1);
    const error = new ExportBlockedError([
      {
        index: 1,
        hash: parsed.mermaid[0].hash,
        source: parsed.mermaid[0].source,
        message: "Syntaxe Mermaid invalide",
      },
    ]);
    expect(error.message).toMatch(/bloqué/i);
  });
});

describe("suggestedExportName", () => {
  it("sanitise le titre H1 y compris les accents", () => {
    expect(suggestedExportName("# Café stratégique\n\nBonjour", "pdf")).toBe("Cafe-strategique.pdf");
    expect(suggestedExportName("pas de titre", "docx")).toBe("document.docx");
  });
});
