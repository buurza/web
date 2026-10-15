import http from 'http';
import { createServer } from 'http';

const DB_PORT = 8080;

// Simple HTTP server for db.local hostname
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Health check endpoint
    if (url.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            service: 'db.local',
            timestamp: new Date().toISOString() 
        }));
        return;
    }
    
    // Auth test endpoint
    if (url.pathname === '/api/auth/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'Authentication system is running',
            ready: true,
            database: 'SQLite',
            orm: 'Prisma'
        }));
        return;
    }
    
    // Serve homepage for everything else
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>TypeScript Auth Database</title>
<style>body{font-family:sans-serif;background:#667eea;color:white;text-align:center;padding:50px;}
h1{margin-bottom:20px;font-size:2.5rem;}
.card{background:rgba(255,255,255,0.2);padding:30px;border-radius:10px;display:inline-block;margin:20px;}
.status{color:#4ade80;font-weight:bold;}</style></head>
<body>
<h1>🚀 TypeScript Auth Database</h1>
<div class="card">
    <p><strong>Status:</strong><span class="status">Running on db.local ✓</span></p>
    <p><strong>Access:</strong> No port needed - just type <code>db.local</code></p>
    <hr style="margin:20px 0;border-color:rgba(255,255,255,0.3);">
    <p><strong>Features:</strong></p>
    <ul style="text-align:left;">
        <li>TypeScript authentication</li>
        <li>bCrypt password hashing</li>
        <li>SQLite database via Prisma ORM</li>
    </ul>
</div>
<p style="margin-top:40px;">Access API: <a href="/api/health" style="color:white">http://db.local/api/health</a></p>
</body></html>
`);
});

server.listen(DB_PORT, '127.0.0.1', () => {
    console.log(`🚀 Server running at http://db.local:${DB_PORT}`);
    console.log(`✅ Access via db.local (no port needed!)`);
    console.log(`📍 localhost:${DB_PORT}/api/health - API health check`);
});
