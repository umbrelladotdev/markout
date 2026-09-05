import { marked, type Token, type Tokens } from "marked";

export type Align = "left" | "center" | "right" | null;

export type InlineSpan = {
  text: string;
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
  href?: string;
};

export type ListNode = {
  ordered: boolean;
  start: number;
  items: ListItemNode[];
};

export type ListItemNode = {
  spans: InlineSpan[];
  nested?: ListNode;
};

export type TableCell = {
  text: string;
  spans: InlineSpan[];
};

export type Block =
  | { type: "heading"; depth: number; text: string; spans: InlineSpan[]; id: string }
  | { type: "paragraph"; spans: InlineSpan[] }
  | { type: "list"; list: ListNode }
  | { type: "table"; header: TableCell[]; rows: TableCell[][]; align: Align[] }
  | { type: "code"; lang: string; text: string }
  | { type: "mermaid"; index: number; source: string; hash: string }
  | { type: "blockquote"; spans: InlineSpan[] }
  | { type: "hr" };

export type MermaidIssue = {
  index: number;
  hash: string;
  source: string;
  message: string;
};

export type ParsedDocument = {
  title: string | null;
  blocks: Block[];
  mermaid: Extract<Block, { type: "mermaid" }>[];
  headings: { depth: number; text: string; id: string }[];
  wordCount: number;
};

const LEXER_OPTIONS = { gfm: true, breaks: false } as const;

export function hashSource(source: string): string {
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "section";
}

export function suggestedExportName(markdown: string, ext: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  const title = match?.[1]?.trim() || "document";
  const slug = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "document"}.${ext}`;
}

export function countWords(markdown: string): number {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/[#>*_\-|\[\]()]/g, " ")
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).length;
}

function asTokens(value: unknown): Token[] {
  return Array.isArray(value) ? (value as Token[]) : [];
}

function flattenText(tokens: Token[] | undefined, fallback = ""): string {
  if (!tokens || tokens.length === 0) return fallback;
  let out = "";
  for (const token of tokens) {
    if ("text" in token && typeof token.text === "string" && !("tokens" in token && token.tokens)) {
      if (token.type === "text" || token.type === "codespan" || token.type === "escape") {
        out += token.text;
        continue;
      }
    }
    if ("tokens" in token && Array.isArray(token.tokens)) {
      out += flattenText(token.tokens as Token[], "text" in token ? String(token.text ?? "") : "");
    } else if ("text" in token && typeof token.text === "string") {
      out += token.text;
    } else if (token.type === "br") {
      out += "\n";
    }
  }
  return out || fallback;
}

function inlineTokens(tokens: Token[] | undefined, fallback = "", style: Partial<InlineSpan> = {}): InlineSpan[] {
  if (!tokens || tokens.length === 0) {
    return fallback ? [{ text: fallback, ...style }] : [];
  }
  const spans: InlineSpan[] = [];
  const push = (span: InlineSpan) => {
    if (!span.text) return;
    const last = spans[spans.length - 1];
    if (
      last &&
      last.bold === span.bold &&
      last.italics === span.italics &&
      last.code === span.code &&
      last.href === span.href
    ) {
      last.text += span.text;
      return;
    }
    spans.push(span);
  };

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        const nested = asTokens((token as Tokens.Text).tokens);
        if (nested.length) {
          inlineTokens(nested, token.text, style).forEach(push);
        } else {
          push({ text: token.text, ...style });
        }
        break;
      }
      case "strong": {
        const t = token as Tokens.Strong;
        inlineTokens(asTokens(t.tokens), t.text, { ...style, bold: true }).forEach(push);
        break;
      }
      case "em": {
        const t = token as Tokens.Em;
        inlineTokens(asTokens(t.tokens), t.text, { ...style, italics: true }).forEach(push);
        break;
      }
      case "codespan":
        push({ text: (token as Tokens.Codespan).text, ...style, code: true });
        break;
      case "link": {
        const t = token as Tokens.Link;
        inlineTokens(asTokens(t.tokens), t.text, { ...style, href: t.href }).forEach(push);
        break;
      }
      case "del": {
        const t = token as Tokens.Del;
        inlineTokens(asTokens(t.tokens), t.text, style).forEach(push);
        break;
      }
      case "br":
        push({ text: "\n", ...style });
        break;
      case "escape":
        push({ text: (token as Tokens.Escape).text, ...style });
        break;
      case "html":
        break;
      default: {
        if ("tokens" in token && Array.isArray(token.tokens)) {
          inlineTokens(token.tokens as Token[], "text" in token ? String(token.text ?? "") : "", style).forEach(push);
        } else if ("text" in token && typeof token.text === "string") {
          push({ text: token.text, ...style });
        }
      }
    }
  }
  return spans;
}

function cellFrom(cell: unknown): TableCell {
  if (typeof cell === "string") {
    return { text: cell, spans: [{ text: cell }] };
  }
  if (cell && typeof cell === "object") {
    const record = cell as { text?: string; tokens?: Token[] };
    const text = record.text ?? flattenText(record.tokens);
    return { text, spans: inlineTokens(record.tokens, text) };
  }
  return { text: "", spans: [] };
}

function parseList(token: Tokens.List): ListNode {
  return {
    ordered: token.ordered,
    start: token.start || 1,
    items: token.items.map((item) => {
      const nestedList = item.tokens.find((t): t is Tokens.List => t.type === "list");
      const contentTokens = item.tokens.filter((t) => t.type !== "list");
      const spans = contentTokens.length
        ? contentTokens.flatMap((t) => {
            if (t.type === "text" || t.type === "paragraph") {
              const withTokens = t as Tokens.Text | Tokens.Paragraph;
              return inlineTokens(asTokens(withTokens.tokens), withTokens.text);
            }
            if ("tokens" in t) {
              return inlineTokens(asTokens(t.tokens), "text" in t ? String(t.text ?? "") : "");
            }
            if ("text" in t && typeof t.text === "string") {
              return [{ text: t.text }];
            }
            return [];
          })
        : [{ text: item.text }];
      return {
        spans: spans.length ? spans : [{ text: item.text }],
        nested: nestedList ? parseList(nestedList) : undefined,
      };
    }),
  };
}

export function parseDocument(markdown: string): ParsedDocument {
  const tokens = marked.lexer(markdown, LEXER_OPTIONS);
  const blocks: Block[] = [];
  const usedIds = new Map<string, number>();
  let mermaidIndex = 0;

  const uniqueId = (text: string) => {
    const base = slugify(text);
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  for (const token of tokens) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        const text = flattenText(heading.tokens, heading.text);
        const id = uniqueId(text);
        blocks.push({
          type: "heading",
          depth: heading.depth,
          text,
          spans: inlineTokens(heading.tokens, text),
          id,
        });
        break;
      }
      case "paragraph": {
        const paragraph = token as Tokens.Paragraph;
        blocks.push({
          type: "paragraph",
          spans: inlineTokens(paragraph.tokens, paragraph.text),
        });
        break;
      }
      case "list":
        blocks.push({ type: "list", list: parseList(token as Tokens.List) });
        break;
      case "table": {
        const table = token as Tokens.Table;
        const header = table.header.map(cellFrom);
        const rows = table.rows.map((row) => row.map(cellFrom));
        const align = (table.align ?? []).map((value) => value ?? null) as Align[];
        blocks.push({ type: "table", header, rows, align });
        break;
      }
      case "code": {
        const code = token as Tokens.Code;
        const lang = (code.lang ?? "").trim().toLowerCase();
        if (lang === "mermaid") {
          const source = code.text.replace(/\n$/, "");
          mermaidIndex += 1;
          blocks.push({
            type: "mermaid",
            index: mermaidIndex,
            source,
            hash: hashSource(source),
          });
        } else {
          blocks.push({ type: "code", lang, text: code.text });
        }
        break;
      }
      case "blockquote": {
        const quote = token as Tokens.Blockquote;
        const text = flattenText(quote.tokens, quote.text);
        blocks.push({
          type: "blockquote",
          spans: inlineTokens(quote.tokens, text),
        });
        break;
      }
      case "hr":
        blocks.push({ type: "hr" });
        break;
      default:
        break;
    }
  }

  const mermaid = blocks.filter((block): block is Extract<Block, { type: "mermaid" }> => block.type === "mermaid");
  const headings = blocks
    .filter((block): block is Extract<Block, { type: "heading" }> => block.type === "heading")
    .map(({ depth, text, id }) => ({ depth, text, id }));
  const title = headings.find((heading) => heading.depth === 1)?.text ?? null;

  return {
    title,
    blocks,
    mermaid,
    headings,
    wordCount: countWords(markdown),
  };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function spansToHtml(spans: InlineSpan[]): string {
  return spans
    .map((span) => {
      let html = escapeHtml(span.text);
      if (span.code) html = `<code>${html}</code>`;
      if (span.bold) html = `<strong>${html}</strong>`;
      if (span.italics) html = `<em>${html}</em>`;
      if (span.href) {
        const href = escapeHtml(span.href);
        html = `<a href="${href}" rel="noreferrer">${html}</a>`;
      }
      return html;
    })
    .join("");
}

function listToHtml(list: ListNode): string {
  const tag = list.ordered ? "ol" : "ul";
  const start = list.ordered && list.start !== 1 ? ` start="${list.start}"` : "";
  const items = list.items
    .map((item) => {
      const nested = item.nested ? listToHtml(item.nested) : "";
      return `<li>${spansToHtml(item.spans)}${nested}</li>`;
    })
    .join("");
  return `<${tag}${start}>${items}</${tag}>`;
}

export function blocksToPreviewHtml(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const tag = `h${Math.min(block.depth, 6)}`;
          return `<${tag} id="${escapeHtml(block.id)}">${spansToHtml(block.spans)}</${tag}>`;
        }
        case "paragraph":
          return `<p>${spansToHtml(block.spans)}</p>`;
        case "list":
          return listToHtml(block.list);
        case "table": {
          const head = block.header
            .map((cell, i) => {
              const align = block.align[i];
              const style = align ? ` style="text-align:${align}"` : "";
              return `<th${style}>${spansToHtml(cell.spans)}</th>`;
            })
            .join("");
          const body = block.rows
            .map((row) => {
              const cells = row
                .map((cell, i) => {
                  const align = block.align[i];
                  const style = align ? ` style="text-align:${align}"` : "";
                  return `<td${style}>${spansToHtml(cell.spans)}</td>`;
                })
                .join("");
              return `<tr>${cells}</tr>`;
            })
            .join("");
          return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
        }
        case "code":
          return `<pre><code class="language-${escapeHtml(block.lang)}">${escapeHtml(block.text)}</code></pre>`;
        case "mermaid":
          return `<div class="mermaid-slot" data-hash="${escapeHtml(block.hash)}" data-index="${block.index}"></div>`;
        case "blockquote":
          return `<blockquote>${spansToHtml(block.spans)}</blockquote>`;
        case "hr":
          return "<hr />";
      }
    })
    .join("\n");
}

export class ExportBlockedError extends Error {
  issues: MermaidIssue[];
  constructor(issues: MermaidIssue[]) {
    super(
      issues.length === 1
        ? "Export bloqué : 1 diagramme Mermaid est invalide."
        : `Export bloqué : ${issues.length} diagrammes Mermaid sont invalides.`,
    );
    this.name = "ExportBlockedError";
    this.issues = issues;
  }
}

export function excerpt(source: string, max = 140): string {
  const compact = source.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max)}…`;
}
