export async function GET() {
  const updatedAt = new Date().toISOString();
  return Response.json({
    updated_at: updatedAt,
    isOnline: true,
    "Do you speak Portuguese?":
      "Claro mermão, mais especificamente (smileIfYouReadThis highlighted because of a PT-BR typo) em UTF-8",
  });
}
