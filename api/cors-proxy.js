// Vercel Function - CORS Proxy dla n8n webhook
module.exports = async function handler(req, res) {
    // Dodanie CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Obsługa preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Tylko POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // URL docelowy n8n webhook
        const N8N_WEBHOOK_URL = 'https://anna2084.app.n8n.cloud/webhook/1221a370-32ad-4fd0-92d2-1a930407c2aa';
        
        console.log('🔄 Proxy request to n8n:', N8N_WEBHOOK_URL);
        console.log('📤 Request body:', req.body);

        // Wyślij request do n8n
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();
        console.log('📥 n8n response status:', response.status);
        console.log('📥 n8n response:', data);

        // Zwróć odpowiedź z n8n
        res.status(response.status);
        
        // Spróbuj sparsować jako JSON, jeśli się nie uda - zwróć jako text
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch {
            res.send(data);
        }

    } catch (error) {
        console.error('❌ Error in CORS proxy:', error);
        res.status(500).json({ 
            error: 'Proxy error', 
            details: error.message 
        });
    }
} 