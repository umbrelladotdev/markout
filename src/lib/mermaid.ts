import { hashSource, type MermaidIssue } from "./document";

export type RenderedDiagram = {
  hash: string;
  index: number;
  source: string;
  svg: string;
  pngDataUrl: string;
  pngBytes: Uint8Array;
  width: number;
  height: number;
};

type CacheEntry =
  | { ok: true; svg: string; png?: Omit<RenderedDiagram, "hash" | "index" | "source" | "svg"> }
  | { ok: false; message: string };

const cache = new Map<string, CacheEntry>();
let mermaidModule: typeof import("mermaid") | null = null;
let loading: Promise<typeof import("mermaid")> | null = null;
let initialized = false;

export function diagramCacheSize(): number {
  return cache.size;
}

export function clearDiagramCache(): void {
  cache.clear();
}

export function hasMermaidFence(markdown: string): boolean {
  return /```mermaid\b/i.test(markdown);
}

async function loadMermaid() {
  if (mermaidModule) return mermaidModule;
  if (!loading) {
    loading = import("mermaid");
  }
  mermaidModule = await loading;
  if (!initialized) {
    mermaidModule.default.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      fontFamily: "Trebuchet MS, Verdana, Arial, sans-serif",
      flowchart: { htmlLabels: false, curve: "basis" },
      themeVariables: {
        fontFamily: "Trebuchet MS, Verdana, Arial, sans-serif",
        primaryColor: "#e7f0ed",
        primaryTextColor: "#1a3c34",
        primaryBorderColor: "#2c5f54",
        lineColor: "#2c5f54",
        secondaryColor: "#f6f4ef",
        tertiaryColor: "#ffffff",
      },
    });
    initialized = true;
  }
  return mermaidModule;
}

export async function validateMermaidSource(source: string): Promise<string | null> {
  const cached = cache.get(hashSource(source));
  if (cached) return cached.ok ? null : cached.message;
  try {
    const mermaid = await loadMermaid();
    await mermaid.default.parse(source);
    return null;
  } catch (error) {
    return humanizeMermaidError(error);
  }
}

function humanizeMermaidError(error: unknown): string {
  const raw =
    error && typeof error === "object" && "str" in error
      ? String((error as { str: unknown }).str)
      : error instanceof Error
        ? error.message
        : String(error);
  const cleaned = raw
    .replace(/^Error:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/lexical|parse|syntax|expect/i.test(cleaned)) {
    return `Syntaxe Mermaid invalide. ${cleaned}`;
  }
  return cleaned || "Diagramme Mermaid invalide.";
}

export async function renderMermaidSvg(source: string, hash: string): Promise<string> {
  const cached = cache.get(hash);
  if (cached?.ok) return cached.svg;
  if (cached && !cached.ok) {
    throw new Error(cached.message);
  }
  const mermaid = await loadMermaid();
  try {
    await mermaid.default.parse(source);
    const id = `markout-${hash}-${Math.random().toString(36).slice(2, 8)}`;
    const { svg } = await mermaid.default.render(id, source);
    cache.set(hash, { ok: true, svg });
    return svg;
  } catch (error) {
    const message = humanizeMermaidError(error);
    cache.set(hash, { ok: false, message });
    throw new Error(message);
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function svgDimensions(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/viewBox=["']([^"']+)["']/i);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const width = Number(svg.match(/width=["']([\d.]+)(?:px)?["']/i)?.[1] ?? 800);
  const height = Number(svg.match(/height=["']([\d.]+)(?:px)?["']/i)?.[1] ?? 450);
  return { width, height };
}

function prepareSvg(svg: string): string {
  return svg
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\((['"]?)https?:\/\/[^)]+\)/gi, "")
    .replace(/\s(?:xlink:)?href=["']https?:\/\/[^"']+["']/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
}

export async function svgToPng(
  svg: string,
  maxWidth = 1400,
): Promise<{ dataUrl: string; width: number; height: number; bytes: Uint8Array }> {
  const cleaned = prepareSvg(svg);
  const size = svgDimensions(cleaned);
  const widthHint = size.width || 800;
  const heightHint = size.height || 450;
  const scale = Math.min(2, widthHint > 0 ? maxWidth / widthHint : 2);
  const width = Math.max(1, Math.round(widthHint * scale));
  const height = Math.max(1, Math.round(heightHint * scale));

  try {
    return await rasterizeWithImage(cleaned, width, height);
  } catch {
    return rasterizeWithCanvg(cleaned, width, height);
  }
}

async function rasterizeWithImage(
  svg: string,
  width: number,
  height: number,
): Promise<{ dataUrl: string; width: number; height: number; bytes: Uint8Array }> {
  const dataUrlSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = await loadImage(dataUrlSvg);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible pour le rendu du diagramme.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, width, height, bytes: dataUrlToBytes(dataUrl) };
}

async function rasterizeWithCanvg(
  svg: string,
  width: number,
  height: number,
): Promise<{ dataUrl: string; width: number; height: number; bytes: Uint8Array }> {
  const { Canvg } = await import("canvg");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible pour le rendu du diagramme.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const renderer = Canvg.fromString(ctx, svg, {
    ignoreMouse: true,
    ignoreAnimation: true,
    ignoreDimensions: true,
  });
  renderer.resize(width, height, "xMidYMid meet");
  await renderer.render();
  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, width, height, bytes: dataUrlToBytes(dataUrl) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de rasteriser le diagramme SVG."));
    img.src = src;
  });
}

export async function renderDiagramForExport(
  index: number,
  source: string,
  hash: string,
): Promise<RenderedDiagram> {
  const svg = await renderMermaidSvg(source, hash);
  const cached = cache.get(hash);
  if (cached?.ok && cached.png) {
    return { hash, index, source, svg, ...cached.png, pngDataUrl: cached.png.pngDataUrl, pngBytes: cached.png.pngBytes };
  }
  const png = await svgToPng(svg);
  const rendered = {
    pngDataUrl: png.dataUrl,
    pngBytes: png.bytes,
    width: png.width,
    height: png.height,
  };
  cache.set(hash, { ok: true, svg, png: rendered });
  return { hash, index, source, svg, ...rendered };
}

export async function collectMermaidIssues(
  diagrams: { index: number; source: string; hash: string }[],
): Promise<MermaidIssue[]> {
  const issues: MermaidIssue[] = [];
  for (const diagram of diagrams) {
    const cached = cache.get(diagram.hash);
    if (cached?.ok) continue;
    if (cached && !cached.ok) {
      issues.push({
        index: diagram.index,
        hash: diagram.hash,
        source: diagram.source,
        message: cached.message,
      });
      continue;
    }
    const message = await validateMermaidSource(diagram.source);
    if (message) {
      cache.set(diagram.hash, { ok: false, message });
      issues.push({
        index: diagram.index,
        hash: diagram.hash,
        source: diagram.source,
        message,
      });
    }
  }
  return issues;
}

export function cachedSvg(hash: string): string | null {
  const entry = cache.get(hash);
  return entry?.ok ? entry.svg : null;
}

export function cachedError(hash: string): string | null {
  const entry = cache.get(hash);
  return entry && !entry.ok ? entry.message : null;
}
