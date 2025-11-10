export async function GET() {
    return Response.json({'isOnline': true,
        "Do you speak Portuguese?": "Claro mermão, mais específicamente em UTF-8"
    })
}
