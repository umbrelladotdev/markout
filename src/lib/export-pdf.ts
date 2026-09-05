import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import type { Block, InlineSpan, ListNode } from "./document";
import type { RenderedDiagram } from "./mermaid";

type PdfMakeApi = {
  createPdf: (doc: TDocumentDefinitions) => { getBuffer: (cb: (buffer: Uint8Array) => void) => void };
  addVirtualFileSystem?: (vfs: unknown) => void;
  vfs?: unknown;
};

let pdfMakeReady: Promise<PdfMakeApi> | null = null;

async function getPdfMake(): Promise<PdfMakeApi> {
  if (!pdfMakeReady) {
    pdfMakeReady = (async () => {
      const pdfMakeMod = await import("pdfmake/build/pdfmake");
      const fontsMod = await import("pdfmake/build/vfs_fonts");
      const pdfMake = (pdfMakeMod.default ?? pdfMakeMod) as PdfMakeApi;
      const fonts = fontsMod as { default?: unknown; pdfMake?: { vfs?: unknown }; vfs?: unknown };
      const vfs = fonts.default ?? fonts;
      if (typeof pdfMake.addVirtualFileSystem === "function") {
        pdfMake.addVirtualFileSystem(vfs);
      } else if (fonts.pdfMake?.vfs) {
        pdfMake.vfs = fonts.pdfMake.vfs;
      } else if (typeof vfs === "object" && vfs && "vfs" in vfs) {
        pdfMake.vfs = (vfs as { vfs: unknown }).vfs;
      } else {
        pdfMake.vfs = vfs;
      }
      return pdfMake;
    })();
  }
  return pdfMakeReady;
}

const CONTENT_WIDTH = 510;

function fit(width: number, height: number, maxWidth = CONTENT_WIDTH): { width: number; height: number } {
  if (width <= maxWidth) {
    const scale = Math.min(1, maxWidth / Math.max(width, 1));
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
  }
  const ratio = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * ratio) };
}

function spansToText(spans: InlineSpan[]): Content {
  const text =
    spans.length === 0
      ? ""
      : spans.map((span) => ({
          text: span.text,
          bold: Boolean(span.bold),
          italics: Boolean(span.italics),
          fontSize: span.code ? 9 : undefined,
          color: span.code ? "#9a3412" : span.href ? "#21554a" : undefined,
          decoration: span.href ? ("underline" as const) : undefined,
        }));
  return { text };
}

function styledText(spans: InlineSpan[], extras: Record<string, unknown>): Content {
  return { ...(spansToText(spans) as object), ...extras } as unknown as Content;
}

function listToContent(list: ListNode, level = 0): Content {
  const items = list.items.map((item) => {
    const stack: Content[] = [spansToText(item.spans)];
    if (item.nested) stack.push(listToContent(item.nested, level + 1));
    return stack.length === 1 ? stack[0] : { stack };
  });
  if (list.ordered) {
    return { ol: items, start: list.start, margin: [level * 8, 2, 0, 2] };
  }
  return { ul: items, margin: [level * 8, 2, 0, 2] };
}

function tableCell(text: Content, fill?: string): TableCell {
  return {
    ...((typeof text === "object" ? text : { text }) as object),
    fillColor: fill,
    margin: [6, 6, 6, 6],
    borderColor: ["#d7d2c8", "#d7d2c8", "#d7d2c8", "#d7d2c8"],
  } as TableCell;
}

export function buildPdfDefinition(
  blocks: Block[],
  diagrams: Map<string, RenderedDiagram>,
  title: string | null,
): TDocumentDefinitions {
  const content: Content[] = [
    {
      toc: {
        title: { text: "Table des matières", style: "tocTitle" },
        numberStyle: { color: "#6b6560" },
      },
      pageBreak: "after",
    },
  ];

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const style = block.depth === 1 ? "h1" : block.depth === 2 ? "h2" : "h3";
        content.push(
          styledText(block.spans, {
            style,
            tocItem: block.depth <= 3,
            headlineLevel: block.depth,
          }),
        );
        break;
      }
      case "paragraph":
        content.push(styledText(block.spans, { style: "body" }));
        break;
      case "list":
        content.push(listToContent(block.list));
        break;
      case "table": {
        const body = [
          block.header.map((cell) => tableCell(spansToText(cell.spans), "#e7f0ed")),
          ...block.rows.map((row) => row.map((cell) => tableCell(spansToText(cell.spans)))),
        ];
        content.push({
          table: {
            headerRows: 1,
            widths: Array(block.header.length).fill("*"),
            body,
          },
          layout: "lightHorizontalLines",
          margin: [0, 8, 0, 12],
        });
        break;
      }
      case "code":
        content.push({
          text: block.text || " ",
          style: "code",
          margin: [0, 6, 0, 10],
        });
        break;
      case "mermaid": {
        const diagram = diagrams.get(block.hash);
        if (!diagram) {
          throw new Error(`Diagramme ${block.index} manquant au moment de l'export PDF.`);
        }
        const size = fit(diagram.width, diagram.height);
        content.push({
          image: diagram.pngDataUrl,
          width: size.width,
          margin: [0, 10, 0, 14],
          alignment: "center",
        });
        break;
      }
      case "blockquote":
        content.push(
          styledText(block.spans, {
            italics: true,
            color: "#3f3a36",
            margin: [12, 8, 0, 8],
          }),
        );
        break;
      case "hr":
        content.push({
          canvas: [{ type: "line", x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.6, lineColor: "#d7d2c8" }],
          margin: [0, 10, 0, 10],
        });
        break;
    }
  }

  return {
    info: {
      title: title ?? "Markout",
      creator: "Markout",
      producer: "Markout",
    },
    pageSize: "A4",
    pageMargins: [43, 50, 43, 56],
    content,
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 9,
      color: "#8a8680",
      margin: [0, 12, 0, 0],
    }),
    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
      lineHeight: 1.35,
      color: "#1c1917",
    },
    styles: {
      tocTitle: { fontSize: 20, bold: true, color: "#1a3c34", margin: [0, 0, 0, 16] },
      h1: { fontSize: 22, bold: true, color: "#1a3c34", margin: [0, 18, 0, 8] },
      h2: { fontSize: 16, bold: true, color: "#21554a", margin: [0, 14, 0, 6] },
      h3: { fontSize: 13, bold: true, color: "#1c1917", margin: [0, 12, 0, 4] },
      body: { margin: [0, 0, 0, 8] },
      code: {
        fontSize: 9,
        color: "#1c1917",
        fillColor: "#f3f0e9",
      },
    },
  };
}

export async function buildPdf(
  blocks: Block[],
  diagrams: Map<string, RenderedDiagram>,
  title: string | null,
): Promise<Uint8Array> {
  const pdfMake = await getPdfMake();
  const definition = buildPdfDefinition(blocks, diagrams, title);
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(definition).getBuffer((buffer) => {
        resolve(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
      });
    } catch (error) {
      reject(error);
    }
  });
}
