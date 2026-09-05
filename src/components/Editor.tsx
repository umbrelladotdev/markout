import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState } from "../lib/theme";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function Editor({ value, onChange }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!parentRef.current) return;
    const view = new EditorView({
      parent: parentRef.current,
      state: createEditorState(value, (next) => onChangeRef.current(next)),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once; file loads are applied in the value effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={parentRef} className="editor-host" role="textbox" aria-label="Éditeur Markdown" />;
}
