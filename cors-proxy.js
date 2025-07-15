const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;
const TARGET_URL = 'https://anna2084.app.n8n.cloud/webhook-test/be2ba487-d26e-4864-92c7-8747039983e6';

const server = http.createServer((req, res) => {
    // Dodanie nagłówków CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Obsługa preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Tylko POST requests
    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
    }
    
    console.log(`🔄 Proxy request: ${req.method} ${req.url}`);
    
    // Zbieranie danych z żądania
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        console.log('📤 Sending to n8n:', body);
        
        // Parsowanie URL n8n
        const targetUrl = url.parse(TARGET_URL);
        
        // Konfiguracja żądania do n8n
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || 443,
            path: targetUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        
        // Wysłanie żądania do n8n
        const proxyReq = https.request(options, (proxyRes) => {
            console.log(`📥 n8n response status: ${proxyRes.statusCode}`);
            
            let responseBody = '';
            proxyRes.on('data', chunk => {
                responseBody += chunk;
            });
            
            proxyRes.on('end', () => {
                console.log('📥 n8n response:', responseBody);
                
                // Przekazanie statusu i danych odpowiedzi
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(responseBody);
            });
        });
        
        proxyReq.on('error', (err) => {
            console.error('❌ Proxy error:', err.message);
            res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
        });
        
        // Wysłanie danych do n8n
        proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(PORT, () => {
    console.log(`🚀 CORS Proxy server running on http://localhost:${PORT}`);
    console.log(`🎯 Proxying requests to: ${TARGET_URL}`);
    console.log('💡 Update your frontend to use: http://localhost:3001');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down proxy server...');
    server.close(() => {
        process.exit(0);
    });
}); 