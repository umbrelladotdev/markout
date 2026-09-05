import { invoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pickOpenMarkdown(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });
  if (typeof selected === "string") return selected;
  return null;
}

export async function pickSaveMarkdown(defaultPath?: string): Promise<string | null> {
  if (!isTauri()) return null;
  const { save } = await import("@tauri-apps/plugin-dialog");
  const selected = await save({
    defaultPath,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  return selected ?? null;
}

export async function pickSaveExport(defaultPath: string, ext: "pdf" | "docx"): Promise<string | null> {
  if (!isTauri()) return null;
  const { save } = await import("@tauri-apps/plugin-dialog");
  const selected = await save({
    defaultPath,
    filters: [
      ext === "pdf"
        ? { name: "PDF", extensions: ["pdf"] }
        : { name: "Word", extensions: ["docx"] },
    ],
  });
  return selected ?? null;
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await invoke("write_text_file", { path, contents });
}

export async function writeBinaryFile(path: string, contents: Uint8Array): Promise<void> {
  await invoke("write_binary_file", { path, contents: Array.from(contents) });
}

export async function openInOs(path: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_in_os", { path });
}

export async function setWindowTitle(title: string): Promise<void> {
  if (!isTauri()) {
    document.title = title;
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setTitle(title);
}

export function downloadBytes(filename: string, bytes: Uint8Array, mime: string): void {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, contents: string): void {
  downloadBytes(filename, new TextEncoder().encode(contents), "text/markdown;charset=utf-8");
}

export function pickBrowserMarkdown(): Promise<{ name: string; contents: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt,text/markdown";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ name: file.name, contents: await file.text() });
    });
    input.click();
  });
}

export async function confirmDiscard(message: string): Promise<boolean> {
  if (isTauri()) {
    const { ask } = await import("@tauri-apps/plugin-dialog");
    return ask(message, { title: "Markout", kind: "warning" });
  }
  return window.confirm(message);
}
