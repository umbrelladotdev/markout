import { useEffect, useRef } from "react";
import { excerpt, type Block } from "../lib/document";
import { cachedError, cachedSvg, renderMermaidSvg } from "../lib/mermaid";

type Props = {
  html: string;
  mermaidBlocks: Extract<Block, { type: "mermaid" }>[];
};

export function Preview({ html, mermaidBlocks }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const sources = useRef(new Map<string, Extract<Block, { type: "mermaid" }>>());
  sources.current = new Map(mermaidBlocks.map((block) => [block.hash, block]));

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.innerHTML = html;
    let cancelled = false;
    const slots = root.querySelectorAll<HTMLElement>(".mermaid-slot");

    slots.forEach((slot) => {
      const hash = slot.dataset.hash ?? "";
      const block = sources.current.get(hash);
      const knownError = cachedError(hash);
      const knownSvg = cachedSvg(hash);

      if (knownError) {
        slot.innerHTML = errorBox(block, knownError);
        return;
      }
      if (knownSvg) {
        slot.innerHTML = `<div class="mermaid-figure">${knownSvg}</div>`;
        return;
      }
      if (!block) {
        slot.innerHTML = errorBox(undefined, "Diagramme introuvable.");
        return;
      }
      slot.innerHTML = `<div class="mermaid-loading">Rendu du diagramme ${block.index}…</div>`;
      void renderMermaidSvg(block.source, hash)
        .then((svg) => {
          if (cancelled || slot.dataset.hash !== hash) return;
          slot.innerHTML = `<div class="mermaid-figure">${svg}</div>`;
        })
        .catch((error: unknown) => {
          if (cancelled || slot.dataset.hash !== hash) return;
          const message = error instanceof Error ? error.message : String(error);
          slot.innerHTML = errorBox(block, message);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [html, mermaidBlocks]);

  return (
    <div className="preview-scroll">
      <article ref={ref} className="preview-article" />
    </div>
  );
}

function errorBox(block: Extract<Block, { type: "mermaid" }> | undefined, message: string): string {
  const index = block?.index ?? "?";
  const sample = block ? excerpt(block.source) : "";
  return `<div class="mermaid-error" role="alert">
    <strong>Diagramme ${index} invalide</strong>
    <p>${escape(message)}</p>
    ${sample ? `<pre>${escape(sample)}</pre>` : ""}
  </div>`;
}

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
