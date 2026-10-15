import { login, getAllUsers } from './src/auth';
import http from 'http';

const PORT = 8080;
const sessions = new Map();

// Handle API requests
function handleAPI(req, res) {
  if (req.url === '/api/health') {
    return res.writeHead(200).end(JSON.stringify({ status: 'ok', service: 'db.local' }));
  }
  
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { username, password } = JSON.parse(body || '{}');
      const result = login(username, password);
      
      if (result.success && result.user) {
        const token = `token_${Date.now()}_${result.user.username}`;
        sessions.set(token, { user: result.user });
        return res.writeHead(200).end(JSON.stringify(result));
      }
      return res.writeHead(401).end(JSON.stringify(result));
    });
    return;
  }

  if (req.url === '/api/db/users' && req.method === 'GET') {
    getAllUsers().then(users => {
      return res.writeHead(200).end(JSON.stringify({ success: true, users }));
    });
    return;
  }

  // Serve login page for everything else
  serveLogin(res);
}

function handleRequest(req, res) {
  if (req.method === 'GET') {
    handleAPI(req, res);
    return;
  }

  // POST requests go to API
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname.startsWith('/api/')) {
    handleAPI(req, res);
    return;
  }

  serveLogin(res);
}

function serveLogin(res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>Login - db.local</title>
<style>body{margin:0;font-family:sans-serif;background:#667eea;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:white;padding:2rem;border-radius:15px;box-shadow:0 10px 40px rgba(0,0,0,0.2);width:min(400px,90%)}.h1{text-align:center;color:#333;margin-bottom:1.5rem;font-size:1.6rem}.form{display:flex;flex-direction:column;gap:1rem}.input{padding:0.8rem;border:2px solid #ddd;border-radius:8px;width:100%}.btn{padding:1rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.1rem;margin-top:1rem}.error{color:red;padding:0.5rem;background:#fee;border-radius:5px;display:none}</style>
</head><body>
<div class="box">
<h1 class="h1">🔐 Login</h1>
<form class="form" id="f"><label>Username<input type="text" name="username" value="admin" required></label>
<label>Password<input type="password" name="password" value="admin" required><div id="err" class="error"></div>
<button type="submit" class="btn">Login</button></form></div>

<script>
// Auto-login on page load with admin/admin
setTimeout(async () => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    const data = await res.json();
    if (res.ok && data.user) {
      localStorage.setItem('token', data.user.token);
      window.location.href = '/';
    }
  } catch (e) {
    console.error('Auto-login failed:', e);
  }
}, 500);

// Also handle manual form submission
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const f=e.target,c=document.getElementById('err');
try{
  const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:f.username.value,password:f.password.value})});
  const j=await r.json();if(r.ok){localStorage.setItem('t',j.user.token);window.location.href='/';}else{c.textContent=j.error;c.style.display='block;}}catch(a){c.textContent='Error';c.style.display='block'}}
</script></body></html>`);
}

// Serve dashboard when logged in
function serveDashboard(res, user) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  fetch('/api/db/users').then(r => r.json()).then(data => {
    const usersHTML = data.users.map(u => 
      `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.name || '-'}</td>
       <td>${new Date(u.createdAt).toLocaleDateString()}</td></tr>`
    ).join('');
    
    res.end(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>Database - db.local</title>
<style>body{margin:0;font-family:sans-serif;background:#f8fafc;color:#334}.header{display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:2px solid #667eea;margin-bottom:2rem}.user-info{background:white;padding:1rem;border-radius:10px;margin-bottom:2rem;box-shadow:0 2px 10px rgba(0,0,0,0.05)}.dashboard{display:grid;grid-template-columns:200px 1fr;gap:2rem}.sidebar button{display:block;width:100%;padding:1rem;margin-bottom:0.5rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;text-align:left}.main{background:white;padding:1.5rem;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}.table{width:100%;border-collapse:collapse}.th,td{padding:1rem;text-align:left;border-bottom:1px solid #e2e8f0}</style>
</head><body>
<div class="header"><h1>🗄️ Database Dashboard</h1><a href="/logout" style="color:#667eea;">Logout</a></div>

<div class="user-info">Welcome back, <strong>${user.name || user.username}!</strong></div>

<main class="dashboard">
<aside class="sidebar"><button onclick="show('users')">📋 Users</button></aside>
<section id="users" class="main"><h2 style="margin-bottom:1rem">User Records</h2>
<table class="table"><thead><tr class="th"><th>ID</th><th>Username</th><th>Name</th><th>Date</th></tr></thead>
<tbody>${usersHTML}</tbody></table></section>
</main></div>

<script>window.show=function(v){document.querySelectorAll('#users').forEach(h=>h.style.display=v==='users'?'block':'none');};
setTimeout(()=>document.querySelector('.sidebar button').click(),500);</script>
</body></html>`);
}

const server = http.createServer(handleRequest);
server.listen(PORT, '127.0.0.1', () => {
  console.log('✅ Server running at http://db.local:' + PORT);
  console.log('🔐 Username: admin | Password: admin');
});
