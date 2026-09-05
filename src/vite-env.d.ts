/// <reference types="vite/client" />

declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    createPdf: (doc: unknown) => { getBuffer: (cb: (buffer: Uint8Array) => void) => void };
    addVirtualFileSystem?: (vfs: unknown) => void;
    vfs?: unknown;
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: { vfs?: unknown; pdfMake?: { vfs?: unknown } };
  export default fonts;
}
