import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
} from "docx";
import type { Block, InlineSpan, ListNode } from "./document";
import type { RenderedDiagram } from "./mermaid";

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
const CONTENT_PX = 600;
const PAGE_WIDTH_DXA = 11906;
const MARGIN_DXA = 851;

function headingLevel(depth: number) {
  return HEADINGS[Math.max(0, Math.min(depth, 6) - 1)];
}

function fit(width: number, height: number): { width: number; height: number } {
  if (width <= CONTENT_PX) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const ratio = CONTENT_PX / width;
  return { width: CONTENT_PX, height: Math.max(1, Math.round(height * ratio)) };
}

function runsFromSpans(spans: InlineSpan[]): TextRun[] {
  if (spans.length === 0) return [new TextRun("")];
  return spans.map(
    (span) =>
      new TextRun({
        text: span.text,
        bold: span.bold,
        italics: span.italics,
        font: span.code ? "Consolas" : undefined,
        size: span.code ? 18 : undefined,
        color: span.code ? "9A3412" : span.href ? "21554A" : undefined,
        underline: span.href ? {} : undefined,
      }),
  );
}

function listParagraphs(list: ListNode, level = 0): Paragraph[] {
  const out: Paragraph[] = [];
  list.items.forEach((item) => {
    out.push(
      new Paragraph({
        children: runsFromSpans(item.spans),
        numbering: {
          reference: list.ordered ? "markout-numbered" : "markout-bullets",
          level,
        },
        spacing: { after: 80 },
      }),
    );
    if (item.nested) out.push(...listParagraphs(item.nested, Math.min(level + 1, 4)));
  });
  return out;
}

function borderedCell(children: Paragraph[], shading?: string): TableCell {
  return new TableCell({
    children,
    shading: shading ? { type: ShadingType.CLEAR, fill: shading } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "D7D2C8" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D7D2C8" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "D7D2C8" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "D7D2C8" },
    },
  });
}

export function buildDocxDocument(
  blocks: Block[],
  diagrams: Map<string, RenderedDiagram>,
  title: string | null,
): Document {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: "Table des matières",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new TableOfContents("Table des matières", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Dans Microsoft Word : cliquez dans la table des matières puis appuyez sur F9 pour mettre à jour les champs.",
          italics: true,
          size: 20,
          color: "6B6560",
        }),
      ],
      spacing: { after: 360 },
    }),
  ];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        children.push(
          new Paragraph({
            children: runsFromSpans(block.spans),
            heading: headingLevel(block.depth),
            spacing: { before: block.depth === 1 ? 280 : 200, after: 120 },
          }),
        );
        break;
      case "paragraph":
        children.push(
          new Paragraph({
            children: runsFromSpans(block.spans),
            spacing: { after: 160 },
          }),
        );
        break;
      case "list":
        children.push(...listParagraphs(block.list));
        break;
      case "table": {
        const header = new TableRow({
          tableHeader: true,
          children: block.header.map((cell) =>
            borderedCell([new Paragraph({ children: runsFromSpans(cell.spans), style: "Strong" })], "E7F0ED"),
          ),
        });
        const rows = block.rows.map(
          (row) =>
            new TableRow({
              children: row.map((cell) => borderedCell([new Paragraph({ children: runsFromSpans(cell.spans) })])),
            }),
        );
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [header, ...rows],
          }),
        );
        children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
        break;
      }
      case "code":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text || " ",
                font: "Consolas",
                size: 18,
              }),
            ],
            shading: { type: ShadingType.CLEAR, fill: "F3F0E9" },
            spacing: { after: 160 },
          }),
        );
        break;
      case "mermaid": {
        const diagram = diagrams.get(block.hash);
        if (!diagram) {
          throw new Error(`Diagramme ${block.index} manquant au moment de l'export Word.`);
        }
        const size = fit(diagram.width, diagram.height);
        const options: IParagraphOptions = {
          children: [
            new ImageRun({
              type: "png",
              data: diagram.pngBytes,
              transformation: { width: size.width, height: size.height },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 160, after: 200 },
        };
        children.push(new Paragraph(options));
        break;
      }
      case "blockquote":
        children.push(
          new Paragraph({
            children: runsFromSpans(block.spans.map((span) => ({ ...span, italics: true }))),
            indent: { left: 360 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 12, color: "21554A", space: 8 },
            },
            spacing: { after: 160 },
          }),
        );
        break;
      case "hr":
        children.push(
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "D7D2C8", space: 1 },
            },
            spacing: { before: 120, after: 120 },
          }),
        );
        break;
    }
  }

  return new Document({
    creator: "Markout",
    title: title ?? "Markout",
    description: "Document exporté avec Markout",
    features: { updateFields: true },
    numbering: {
      config: [
        {
          reference: "markout-bullets",
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 420 * (level + 1), hanging: 180 } } },
          })),
        },
        {
          reference: "markout-numbered",
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 420 * (level + 1), hanging: 180 } } },
          })),
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          paragraph: { spacing: { before: 280, after: 120 } },
          run: { font: "Calibri", size: 36, bold: true, color: "1A3C34" },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          paragraph: { spacing: { before: 240, after: 100 } },
          run: { font: "Calibri", size: 28, bold: true, color: "21554A" },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          paragraph: { spacing: { before: 200, after: 80 } },
          run: { font: "Calibri", size: 24, bold: true, color: "1C1917" },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_DXA, height: 16838 },
            margin: {
              top: MARGIN_DXA,
              bottom: MARGIN_DXA,
              left: MARGIN_DXA,
              right: MARGIN_DXA,
            },
          },
        },
        children,
      },
    ],
  });
}

export async function buildDocx(
  blocks: Block[],
  diagrams: Map<string, RenderedDiagram>,
  title: string | null,
): Promise<Uint8Array> {
  const document = buildDocxDocument(blocks, diagrams, title);
  const buffer = await Packer.toArrayBuffer(document);
  return new Uint8Array(buffer);
}
