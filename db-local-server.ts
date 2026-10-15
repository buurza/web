import { login, getAllUsers, ensureAdmin } from './src/auth';
import http from 'http';

const PORT = 8080;

async function initialize() {
    await ensureAdmin();
}

function handleAPI(req, res) {
    if (req.url === '/api/health') {
        return res.writeHead(200).end(JSON.stringify({ status: 'ok', service: 'db.local' }));
    }

    if (req.url === '/api/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const { username, password } = JSON.parse(body || '{}');
            const result = login(username, password);

            if (result.success && result.user) {
                res.writeHead(200).end(JSON.stringify({ success: true, user: { ...result.user, token: `token_${Date.now()}_${username}` } }));
            } else {
                res.writeHead(401).end(JSON.stringify(result));
            }
        });
        return;
    }

    if (req.url === '/api/db/users' && req.method === 'GET') {
        getAllUsers().then(users => {
            res.writeHead(200).end(JSON.stringify({ success: true, users }));
        }).catch(err => {
            res.writeHead(500).end(JSON.stringify({ error: err.message }));
        });
        return;
    }

    serveLogin(res);
}

function handleRequest(req, res) {
    if (req.method === 'GET') {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        
        if (url.pathname.startsWith('/api/')) {
            handleAPI(req, res);
            return;
        }

        serveLogin(res);
        return;
    }

    handleAPI(req, res);
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
}, 500);
</script>
</body>
</html>`);
}

function serveDashboard(res) {
    fetch('/api/db/users').then(async r => {
        if(!r.ok) throw new Error('Failed to fetch users');
        const data = await r.json();
        
        let rows = '';
        if(data.users.length === 0){
            rows = '<tr><td colspan="4" style="text-align:center;padding:60px;color:#666;">No users in database</td></tr>';
        } else {
            rows = data.users.map(u => `<tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.username)}</td>
                <td>${escapeHtml(u.name)}</td>
                <td>${new Date(u.createdAt).toISOString().split('T')[0]}</td>
            </tr>`).join('');
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

<p class="user-info">Logged in as <strong>${data.users[0]?.username || 'admin'}</strong></p>

<div class="container">
<div class="stats">
<div class="stat-card">
<h2>${data.users.length}</h2>
<p>Total Users</p>
</div>
</div>

<div class="table-container">
<h2>User Records</h2>
${data.users.length === 0 ? '<div class="empty-state">No users found in database</div>' : '<table><thead><tr><th>ID</th><th>Username</th><th>Name</th><th>Created</th></tr></thead><tbody>'+rows+'</tbody></table>'}
</div>

<div style="text-align:center;margin-top:60px;color:#666;font-size:13px">SQLite Database | Credentials: admin / admin</div>
</div>
</body>
</html>`);
    }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><head><title>Error</title></head><body style="background:#000;color:#fff;padding:60px;text-align:center;font-family:sans-serif"><h1>DATABASE ERROR</h1><p>${escapeHtml(err.message)}</p></body></html>`);
    });
}

function serveLogout(res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Logout</title><style>body{margin:0;padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}a{color:#fff;text-decoration:none;border:2px solid #fff;padding:20px 40px;border-radius:0;font-size:18px;text-transform:uppercase;font-weight:700;transition:all 0.2s}a:hover{background:#fff;color:#000}</style></head><body><h1>Logging Out...</h1><a href="/">Return Home</a></body></html>`);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":"&#39;",'"':'&quot;'}[c]));
}

const server = http.createServer(handleRequest);

async function startServer() {
    await initialize();
    
    // Add authentication middleware
    server.on('request', (req, res) => {
        const authHeader = (req.headers as any).authorization;
        let token = null;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        
        // Only allow access with valid tokens
        if (token !== 'admin-token-123' && token !== 'admin-token-456') {
            serveLogin(res);
            return;
        }
        
        serveDashboard(res);
    });

    server.on('error', (err) => console.error('Server error:', err));

    console.log('\n🚀 DB.LOCAL');
    console.log('═══════════════════');
    console.log('Server: http://db.local:8080');
    console.log('Dashboard: http://localhost:8080/dashboard');
    console.log('\nCredentials: admin / admin\n');
    
    server.listen(PORT, '127.0.0.1', () => {});
}

startServer().catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});