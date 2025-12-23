import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => Promise.resolve(DocumentEditorComponent), {
  ssr: false,
});

function DocumentEditorComponent({ document }) {
  const containerRef = useRef(null);
  const superdocRef = useRef(null);

  useEffect(() => {
    const initEditor = async () => {
      const { SuperDoc } = await import("@harbour-enterprises/superdoc");

      if (containerRef.current) {
        superdocRef.current = new SuperDoc({
          selector: containerRef.current,
          document,
        });
      }
    };

    initEditor();

    return () => {
      superdocRef.current = null;
    };
  }, [document]);

  return <div ref={containerRef} style={{ height: "700px" }} />;
}

export default DocumentEditor;
