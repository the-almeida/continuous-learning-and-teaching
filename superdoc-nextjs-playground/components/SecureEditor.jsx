import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const DocumentEditor = dynamic(() => import("./DocumentEditor"), {
  ssr: false,
});

export default function SecureEditor() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (!session) return <div>Please sign in</div>;

  return (
    <DocumentEditor
      document="/cvGustavoAlmeida.docx"
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
