import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => Promise.resolve(DocumentEditorComponent), {
  ssr: false,
});

function DocumentEditorComponent({ document }) {
  const containerRef = useRef(null);
  const superdocRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const initEditor = async () => {
      const { SuperDoc } = await import("@harbour-enterprises/superdoc");

      if (!isMounted || !containerRef.current) return;

      superdocRef.current = new SuperDoc({
        selector: containerRef.current,
        document,
      });
    };

    initEditor();

    return () => {
      isMounted = false;

      if (superdocRef.current?.destroy) {
        superdocRef.current.destroy();
      } else if (superdocRef.current?.unmount) {
        superdocRef.current.unmount();
      }

      superdocRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ height: "700px" }} />;
}

export default DocumentEditor;
