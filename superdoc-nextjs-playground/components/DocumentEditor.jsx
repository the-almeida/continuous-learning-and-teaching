import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => Promise.resolve(DocumentEditorComponent), {
  ssr: false,
});

function DocumentEditorComponent({ document }) {
  const containerRef = useRef(null);
  const toolbarRef = useRef(null);
  const superdocRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const initEditor = async () => {
      const { SuperDoc } = await import("@harbour-enterprises/superdoc");

      if (!isMounted || !containerRef.current) return;

      superdocRef.current = new SuperDoc({
        superdocId: "cvGustavoAlmeida",
        selector: containerRef.current,
        document,
        user: {
          name: "Gustavo Almeida",
          email: "gustavo.s.p.almeida@gmail.com",
          image: "what happens if I put a random string here??",
        },
        role: "suggester",
        modules: {
          toolbar: { selector: toolbarRef.current, hideButtons: false },
        },
        onReady: ({ superdoc }) => {
          console.log("SuperDoc Ready", superdoc);
        },
        onEditorCreate: ({ editor }) => {
          console.log("Editor is created", editor);
        },
        onEditorUpdate: ({ editor }) => {
          console.log("Content changed", editor);
        },
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

  return (
    <>
      <div
        ref={toolbarRef}
        style={{ height: "100px", width: "100%", backgroundColor: "red" }}
      />
      <div ref={containerRef} style={{ height: "700px" }} />
    </>
  );
}

export default DocumentEditor;
