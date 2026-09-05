import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, defaultHighlightStyle, syntaxHighlighting, bracketMatching } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { tags as t } from "@lezer/highlight";

const markoutTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "#faf8f4",
      color: "#1c1917",
      fontSize: "15px",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
      lineHeight: "1.65",
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: "#21554a",
      padding: "20px 22px 48px 8px",
    },
    ".cm-gutters": {
      backgroundColor: "#f3f0e9",
      color: "#8a8680",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-activeLine": { backgroundColor: "rgba(33, 85, 74, 0.06)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#21554a" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(33, 85, 74, 0.18) !important",
    },
    ".cm-cursor": { borderLeftColor: "#21554a" },
  },
  { dark: false },
);

const markoutHighlight = HighlightStyle.define([
  { tag: t.heading, color: "#1a3c34", fontWeight: "700" },
  { tag: t.heading1, fontSize: "1.15em" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#21554a" },
  { tag: t.url, color: "#3f6f64" },
  { tag: t.monospace, color: "#9a3412" },
  { tag: t.keyword, color: "#21554a" },
  { tag: t.comment, color: "#8a8680", fontStyle: "italic" },
  { tag: t.meta, color: "#6b6560" },
  { tag: t.processingInstruction, color: "#21554a", fontWeight: "600" },
  { tag: t.strikethrough, textDecoration: "line-through" },
]);

export function createEditorState(doc: string, onChange: (value: string) => void): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      dropCursor(),
      history(),
      bracketMatching(),
      highlightSelectionMatches(),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      syntaxHighlighting(markoutHighlight),
      markoutTheme,
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
}
