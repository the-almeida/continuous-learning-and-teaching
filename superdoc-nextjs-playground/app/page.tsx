"use client";

import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => import("@/components/DocumentEditor"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between p-16 bg-white dark:bg-black sm:items-start">
        <h1 className="font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Hi, I'm Gus, and I'm trying out the SuperDoc + NextJS. If it works you
          should see my CV bellow 😊👇
        </h1>
        <DocumentEditor document="/cvGustavoAlmeida.docx" />
      </main>
    </div>
  );
}
