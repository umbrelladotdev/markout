import { describe, expect, it } from "vitest";
import { parseDocument } from "./document";
import { buildPdfDefinition } from "./export-pdf";
import type { RenderedDiagram } from "./mermaid";

const fake: RenderedDiagram = {
  hash: "x",
  index: 1,
  source: "flowchart LR\n  X[Entrée] --> Y[Sortie]",
  svg: "<svg></svg>",
  pngDataUrl: "data:image/png;base64,AAA",
  pngBytes: new Uint8Array([1, 2, 3]),
  width: 400,
  height: 200,
};

describe("export PDF definition", () => {
  it("place une TOC, une image de diagramme, et aucun source Mermaid", () => {
    const markdown = `# Café\n\n## Suite\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n\`\`\`mermaid\nflowchart LR\n  X[Entrée] --> Y[Sortie]\n\`\`\`\n`;
    const parsed = parseDocument(markdown);
    const diagrams = new Map([[parsed.mermaid[0].hash, { ...fake, hash: parsed.mermaid[0].hash }]]);
    const definition = buildPdfDefinition(parsed.blocks, diagrams, parsed.title);
    const json = JSON.stringify(definition);
    expect(definition.pageSize).toBe("A4");
    expect(json).toContain("toc");
    expect(json).toContain("Table des matières");
    expect(json).toContain("image");
    expect(json).not.toContain("flowchart LR");
    expect(json).not.toContain("X[Entrée]");
    expect(json).toContain("Café");
  });
});
