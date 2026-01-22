"use client";

import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => import("@/components/DocumentEditor"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

export default function Home() {
  return (
    <div>
      <main className="p-16 bg-black">
        <h1 className="font-semibold leading-10 tracking-tight text-zinc-50">
          Hi, I'm Gus, and I'm trying out the SuperDoc + NextJS. You should see
          my CV bellow 😊👇
        </h1>
        <DocumentEditor document="/cvGustavoAlmeida.docx" />
      </main>
    </div>
  );
}
