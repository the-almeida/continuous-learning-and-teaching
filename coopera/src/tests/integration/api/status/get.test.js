test('GET to /api/status should return 200', async () => { 
    const response = await fetch("http://localhost:3000/api/status", {
        method: 'GET'
    }) 
    expect(response.status).toBe(200)
})