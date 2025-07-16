const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;
const TARGET_URL = 'https://anna2084.app.n8n.cloud/webhook-test/1221a370-32ad-4fd0-92d2-1a930407c2aa';

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
        let requestData;
        try {
            requestData = JSON.parse(body);
            console.log('📤 Sending to n8n:', body);
        } catch (e) {
            console.error('❌ Invalid JSON:', body);
            res.writeHead(400, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
        }
        
        // Sprawdź typ żądania
        const action = requestData.action || 'chat';
        
        // Wybierz odpowiedni endpoint n8n w zależności od akcji
        let targetEndpoint = TARGET_URL;
        
        if (action === 'getPresentation') {
            // Endpoint do generowania prezentacji
            targetEndpoint = 'https://anna2084.app.n8n.cloud/webhook-test/presentation-generator';
            console.log('📊 Using presentation endpoint');
        }
        
        // Parsowanie URL n8n
        const targetUrl = url.parse(targetEndpoint);
        
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
                
                // Obsługa błędu 404 z n8n - próba użycia danych przykładowych
                if (proxyRes.statusCode === 404 && action === 'getPresentation') {
                    console.log('⚠️ Endpoint not found, using example data');
                    
                    // Przykładowe dane prezentacji
                    const exampleData = {
                        slides: [
                            {
                                number: 1,
                                header: "Problem Statement",
                                body: "Many dog owners struggle to help their pets maintain a healthy weight, leading to various health issues and reduced quality of life for their beloved companions.",
                                image: "Dog Health Infographic",
                                photo_desc: "Photo Description: Infographic showing obesity statistics in dogs",
                                narration: "Today, we're addressing a critical issue affecting millions of dogs worldwide - obesity and weight management challenges that impact their health and happiness."
                            },
                            {
                                number: 2,
                                header: "Solution Overview",
                                body: "Our innovative app connects dog owners with veterinary nutritionists and provides personalized meal plans and exercise routines tailored to each dog's specific needs.",
                                image: "App Interface Screenshot",
                                photo_desc: "Screenshot showing the app's meal planning interface",
                                narration: "Our solution brings professional guidance directly to pet owners through an easy-to-use mobile application."
                            },
                            {
                                number: 3,
                                header: "Market Opportunity",
                                body: "With over 85 million dog owners in the US alone and pet obesity rates rising to 60%, the market for effective weight management solutions is substantial and growing.",
                                image: "Market Growth Chart",
                                photo_desc: "Chart showing growth in pet health app market",
                                narration: "The pet health market represents a $20 billion opportunity with consistent year-over-year growth."
                            }
                        ]
                    };
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify(exampleData));
                    return;
                }
                
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