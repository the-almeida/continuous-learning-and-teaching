export async function GET(request, { params }) {
  const docId = params.id;

  // Fetch document from storage
  const document = await fetchDocumentFromStorage(docId);

  return new Response(document, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  });
}
