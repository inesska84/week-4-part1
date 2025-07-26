// Vercel Function - CORS Proxy dla n8n webhook
export default async function(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const N8N_URL = 'https://anna2084.app.n8n.cloud/webhook/1221a370-32ad-4fd0-92d2-1a930407c2aa';
        
        const response = await fetch(N8N_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();
        
        res.status(response.status);
        
        try {
            res.json(JSON.parse(data));
        } catch {
            res.send(data);
        }
    } catch (error) {
        res.status(500).json({ error: 'Proxy error', details: error.message });
    }
} 