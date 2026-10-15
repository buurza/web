import { login, getAllUsers, deleteUserById } from './src/auth';
import http from 'http';

const PORT = 8080;
const activeSessions = new Map();

function setupAPI(req, res) {
  // Health check
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'db.local', database: 'SQLite users table' }));
    return;
  }

  // Login endpoint
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const { username, password } = JSON.parse(body || '{}');
      const result = login(username, password);
      
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

  // Logout endpoint
  if (req.url === '/api/auth/logout' && req.method === 'POST') {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) activeSessions.delete(token);
    res.writeHead(200).end(JSON.stringify({ success: true }));
    return;
  }

  // Homepage - Login or Dashboard
  if (req.url === '/' && req.method === 'GET') {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token || !activeSessions.has(token)) {
      serveLogin(res);
      return;
    }

    authenticate(req, res, () => {
      if (!activeSessions.has(token)) {
        serveLogin(res);
        return;
      }

      const session = activeSessions.get(token);
      if (session && Date.now() < session.expiry) {
        serveDashboard(res, session.user);
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
  res.end(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login - TypeScript Auth Database</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center}
.container{background:white;padding:2rem;border-radius:15px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(400px,90%)}
h1{color:#333;margin-bottom:0.5rem;font-size:1.8rem;text-align:center}
.subtitle{color:#666;text-align:center;margin-bottom:2rem}
form{margin-bottom:1.5rem}
label{display:block;margin-bottom:0.5rem;color:#555;font-weight:500}
input{width:100%;padding:0.8rem;margin-bottom:1rem;border:2px solid #e9ecef;border-radius:8px;font-size:1rem;transition:border-color 0.3s}
input:focus{outline:none;border-color:#667eea}
.btn{width:100%;padding:1rem;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:8px;font-size:1.1rem;cursor:pointer;margin-top:1rem;transition:transform 0.2s}
.btn:hover{transform:translateY(-2px)}
.error{color:#dc3545;margin:0.5rem 0;padding:0.5rem;background:#f8d7da;border-radius:5px;display:none;text-align:center}
.features{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e9ecef;color:#666;font-size:0.9rem}
.feature-item{margin-bottom:0.5rem}
</style>
</head><body>
<div class="container">
<h1>🔐 TypeScript Auth Database</h1>
<p class="subtitle">Login to access the database</p>

<form id="loginForm">
<label for="username"><strong>Username</strong></label>
<input type="text" id="username" name="username" placeholder="Enter username" value="admin" required autofocus>

<label for="password"><strong>Password</strong></label>
<input type="password" id="password" name="password" placeholder="Enter password" value="admin" required>

<div class="error" id="errorMsg"></div>
<button type="submit" class="btn">Login</button>
</form>

<div class="features">
<div class="feature-item">📊 View database records</div>
<div class="feature-item">🔒 Secure authentication with bcrypt</div>
<div class="feature-item">⚡ Fast SQLite database</div>
</div>
</div>

<script>
document.getElementById('loginForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const username=document.getElementById('username').value;
  const password=document.getElementById('password').value;
  
  try{
    const response=await fetch('/api/auth/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})
    });
    
    const data=await response.json();
    
    if(response.ok){
      localStorage.setItem('token',data.user.token);
      alert('Login successful! Redirect
