import { login, ensureAdmin } from './src/auth';
import http from 'http';

const PORT = 8080;
const activeSessions = new Map();

function setupAPI(req, res) {
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'db.local', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.url === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const { email, password } = JSON.parse(body || '{}');
      const result = login(email, password);
      
      if (result.success) {
        activeSessions.set(result.user.token, { user: result.user, expiry: Date.now() + 3600000 });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: result.user }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }
    });
    return;
  }

  if (req.url === '/' && req.method === 'GET') {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token || !activeSessions.has(token)) {
      serveLogin(res);
      return;
    }

    authenticate(req, res, () => {
      const session = activeSessions.get(token);
      if (session && Date.now() < session.expiry) {
        serveProtectedPage(res, session.user);
      } else {
        serveLogin(res);
      }
    });
    return;
  }

  serveLogin(res);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
  }

  const token = authHeader.split(' ')[1];
  
  const session = activeSessions.get(token);
  if (!session) {
    return res.writeHead(403).end(JSON.stringify({ error: 'Invalid token' }));
  }

  if (Date.now() > session.expiry) {
    activeSessions.delete(token);
    return res.writeHead(401).end(JSON.stringify({ error: 'Session expired' }));
  }

  req.user = session.user;
  next();
}

function serveLogin(res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Login</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;background:#667eea;color:white;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.container{background:white;padding:2rem;border-radius:15px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:400px;width:90%;text-align:center;}
h1{margin-bottom:1rem;font-size:1.8rem;color:#333;}input{width:100%;padding:0.8rem;margin:0.5rem 0;border:2px solid #e9ecef;border-radius:8px;}
button{width:100%;padding:1rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:1rem;}
.error{color:#dc3545;margin:0.5rem 0;padding:0.5rem;background:#f8d7da;border-radius:5px;display:none;}</style></head>
<body><div class="container"><h1>TyScript Auth</h1>
<form id="loginForm"><label>Email<input type="email" id="email" value="admin" required></label>
<label>Password<input type="password" id="password" value="admin123" required><div class="error" id="errorMsg"></div>
<button>Login</button></form></div>
<script>document.getElementById('loginForm').addEventListener('submit',async(e)=>{e.preventDefault();
const email=document.getElementById('email').value,password=document.getElementById('password').value;
try{const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
const data=await res.json();if(res.ok){localStorage.setItem('token',data.user.token);window.location='/';}else{document.getElementById('errorMsg').textContent=data.error;display:block;}}catch(err){document.getElementById('errorMsg').textContent='Error';display:block;}}</script></body></html>`);
}

function serveProtectedPage(res, user) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html><html><head><title>Dashboard</title><style>body{font-family:sans-serif;background:#667eea;color:white;text-align:center;padding:50px;}h1{font-size:2.5rem;}button{padding:10px 20px;margin-top:20px;cursor:pointer;background:rgba(255,255,255,0.2);border:none;border-radius:5px;color:white;font-size:1rem;}</style></head>
<body><h1>Welcome, ${user.name || 'User'}!</h1><p>You are logged in.</p><button onclick="location='/login'">Logout</button></body></html>`);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    setupAPI(req, res);
    return;
  }
  serveLogin(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://db.local:${PORT}`);
  console.log(`Admin login: admin / admin123`);
});
