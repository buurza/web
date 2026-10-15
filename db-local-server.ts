import { login, getAllUsers, ensureAdmin } from './src/auth';
import http from 'http';

const PORT = 8091;

async function initialize() {
    await ensureAdmin();
}

// Single handler - all logic here to avoid state issues
function handleRequest(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    // API calls first
    if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/health' && req.method === 'GET') {
            res.writeHead(200).end(JSON.stringify({ status: 'ok', service: 'db.local' }));
            return;
        }

        if (url.pathname === '/api/auth/login' && req.method === 'POST') {
            const chunks: Buffer[] = [];
            
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => {
                try {
                    const body = Buffer.concat(chunks).toString('utf-8');
                    if (!body) {
                        res.writeHead(400).end(JSON.stringify({ error: 'Empty request body' }));
                        return;
                    }
                    
                    let parsed;
                    try { parsed = JSON.parse(body); } catch(e) { throw new Error('Invalid JSON'); }
                    
                    const { username, password } = parsed || {};
                    const result = login(username, password);

                    if (result.success && result.user) {
                        res.writeHead(200).end(JSON.stringify({ success: true, user: { ...result.user, token: `token_${Date.now()}_${username}` } }));
                    } else {
                        res.writeHead(401).end(JSON.stringify(result));
                    }
                } catch (err) {
                    res.writeHead(400).end(JSON.stringify({ error: 'Invalid request' }));
                }
            });
            return;
        }

        if (url.pathname === '/api/db/users' && req.method === 'GET') {
            getAllUsers().then(users => {
                res.writeHead(200).end(JSON.stringify({ success: true, users }));
            }).catch(err => {
                res.writeHead(500).end(JSON.stringify({ error: err.message }));
            });
            return;
        }

        res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    // Non-API routes - check auth first
    if (!url.pathname.startsWith('/api/')) {
        const authHeader = (req.headers as any).authorization;
        let token = null;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // Redirect unauthenticated users to login
        if (!token && !url.pathname.startsWith('/api/auth/')) {
            res.writeHead(302, { 'Location': '/' });
            return;
        }

        // Serve dashboard for authenticated users
        serveDashboard(res);
        return;
    }

    // Serve login page
    serveLogin(res);
}

function serveLogin(res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
.container{width:420px;padding:40px}
h1{text-align:center;font-size:32px;font-weight:700;margin-bottom:60px;letter-spacing:-1px}
.form-group{margin-bottom:25px}
label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:10px;font-weight:500}
input[type="text"],input[type="password"]{width:100%;padding:16px 20px;background:#111;border:1px solid #333;border-radius:0;font-size:14px;color:#fff;outline:none;transition:border-color 0.2s}
input:focus{border-color:#fff}
button{width:100%;padding:18px;background:#fff;color:#000;border:none;border-radius:0;font-size:14px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:background 0.2s;margin-top:10px}
button:hover{background:#ccc}
.auto-login{text-align:center;padding:25px 0;color:#666;font-size:13px;border-top:1px solid #222;margin-top:40px}
.error{text-align:center;padding:20px;color:#fff;font-size:14px;background:#330000;border-radius:0;margin-top:20px;display:none}
</style>
</head>
<body>
<div class="container">
<h1>DB.LOCAL</h1>
<form id="loginForm">
<div class="form-group"><label>Username<input type="text" name="username" value="admin" required style="margin-bottom:0"></label></div>
<div class="form-group"><label>Password<input type="password" name="password" value="admin" required style="margin-bottom:0"></label></div>
<button type="submit">Login</button>
</form>
<div class="error" id="errorMsg"></div>
<p class="auto-login">Auto-login in 1 second...</p>
</div>
<script>
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') }) });
        const data = await r.json();
        if(r.ok && data.user){ localStorage.setItem('db-token',data.user.token); window.location.href='/dashboard'; } else { document.getElementById('errorMsg').textContent=data.error||'Login failed'; document.getElementById('errorMsg').style.display='block'; }
    } catch(err) { console.error(err); }
};

setTimeout(async () => {
    try {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username: 'admin', password: 'admin' }) });
        const data = await r.json();
        if(r.ok && data.user){ localStorage.setItem('db-token',data.user.token); window.location.href='/dashboard'; }
    } catch(e) { console.error(e); }
}, 1000);
</script>
</body>
</html>`);
}

function serveDashboard(res, users = []) {
    let rows = '';
    if (users.length === 0) {
        rows = '<tr><td colspan="4" style="text-align:center;padding:60px;color:#666;">No users in database</td></tr>';
    } else {
        rows = users.map(u => `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.name || ''}</td><td>${new Date(u.createdAt).toISOString().split('T')[0]}</td></tr>`).join('');
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#000;color:#fff;min-height:100vh}
.header{display:flex;justify-content:space-between;align-items:center;padding:30px;border-bottom:2px solid #fff;margin-bottom:40px}
.header h1{font-size:24px;font-weight:700}
.user-info{text-align:right;color:#888;font-size:14px;margin-bottom:20px}
.logout-btn{padding:10px 25px;background:#fff;color:#000;border:none;text-decoration:none;font-weight:700;text-transform:uppercase;cursor:pointer;border-radius:0;transition:background 0.2s}
.logout-btn:hover{background:#ccc}
.container{max-width:1200px;margin:0 auto;padding:40px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:30px;margin-bottom:50px}
.stat-card{background:#fff;color:#000;padding:30px;border-radius:0;border-left:4px solid #fff}
.stat-card h2{font-size:72px;font-weight:700;line-height:1;margin-bottom:8px}
.stat-card p{text-transform:uppercase;letter-spacing:2px;font-size:12px;color:#666}
.table-container{background:#fff;color:#000;padding:40px;border-radius:0}
h2{font-size:18px;font-weight:700;margin-bottom:30px;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #000;padding-bottom:15px;display:inline-block}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:20px;border-bottom:1px solid #ccc;font-size:14px}
th{text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#666;background:#f5f5f5}
tr:hover td{background:#f9f9f9}
td:nth-child(2){font-weight:700}
.empty-state{text-align:center;padding:80px;color:#666;font-size:16px}
</style>
</head>
<body>
<div class="header">
<h1>DB.LOCAL</h1>
<a href="/logout" class="logout-btn">Logout</a>
</div>

<p class="user-info">Logged in as <strong>${users[0]?.username || 'admin'}</strong></p>

<div class="container">
<div class="stats">
<div class="stat-card">
<h2>${users.length}</h2>
<p>Total Users</p>
</div>
</div>

<div class="table-container">
<h2>User Records</h2>
${users.length === 0 ? '<div class="empty-state">No users found in database</div>' : '<table><thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Created</th></tr></thead><tbody>'+rows+'</tbody></table>'}
</div>

<div style="text-align:center;margin-top:60px;color:#666;font-size:13px">SQLite Database | Credentials: admin / admin</div>
</div>
</body>
</html>`);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":"&#39;",'"':'&quot;'}[c]));
}

const server = http.createServer(handleRequest);

async function startServer() {
    await initialize();
    
    console.log('\n🚀 DB.LOCAL');
    console.log('═══════════════════');
    console.log('Server: http://db.local:8091');
    console.log('Dashboard: http://localhost:8091/dashboard');
    console.log('\nCredentials: admin / admin\n');
    
    server.listen(PORT, '127.0.0.1', () => {});
}

startServer().catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});