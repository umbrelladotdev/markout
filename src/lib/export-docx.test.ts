import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseDocument } from "./document";
import { buildDocx } from "./export-docx";
import type { RenderedDiagram } from "./mermaid";

const PNG_1x1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

function fakeDiagram(index: number, source: string, hash: string): RenderedDiagram {
  return {
    hash,
    index,
    source,
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'></svg>",
    pngDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    pngBytes: PNG_1x1,
    width: 400,
    height: 220,
  };
}

describe("export DOCX", () => {
  it("embarque les diagrammes comme images et un champ TOC, sans source Mermaid", async () => {
    const markdown = `# Titre café\n\n## Section\n\nUn paragraphe.\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n\`\`\`mermaid\nflowchart LR\n  X[Entrée] --> Y[Sortie]\n\`\`\`\n`;
    const parsed = parseDocument(markdown);
    expect(parsed.mermaid).toHaveLength(1);
    const diagrams = new Map<string, RenderedDiagram>([
      [parsed.mermaid[0].hash, fakeDiagram(1, parsed.mermaid[0].source, parsed.mermaid[0].hash)],
    ]);
    const bytes = await buildDocx(parsed.blocks, diagrams, parsed.title);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toBeTruthy();
    expect(xml).toContain("TOC");
    expect(xml).toMatch(/Heading1|Titre/);
    expect(xml).not.toContain("flowchart LR");
    expect(xml).not.toContain("```mermaid");
    expect(xml).not.toContain("X[Entrée]");
    const media = Object.keys(zip.files).filter((name) => name.startsWith("word/media/"));
    expect(media.length).toBeGreaterThan(0);
  });
});
