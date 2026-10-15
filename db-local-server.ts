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
<title>Login - db.local</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#667eea;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:white;padding:2rem;border-radius:15px;box-shadow:0 10px 40px rgba(0,0,0,0.2);width:min(400px,90%)}
h1{text-align:center;color:#333;margin-bottom:1.5rem;font-size:1.6rem}
.form{display:flex;flex-direction:column;gap:1rem}
label{display:flex;flex-direction:column;gap:0.3rem}
input{padding:0.8rem;border:2px solid #ddd;border-radius:8px;width:100%;font-size:1rem}
.btn{padding:1rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.1rem;margin-top:1rem}
.auto-login{text-align:center;color:#666;font-size:0.9rem;margin-top:1rem}
.error{color:red;text-align:center;margin-top:0.5rem}
</style>
</head>
<body>
<div class="box">
<h1><strong>Login - db.local</strong></h1>
<form class="form" id="loginForm">
<label><input type="text" name="username" value="admin" placeholder="Username" required></label>
<label><input type="password" name="password" value="admin" placeholder="Password" required></label>
<button type="submit" class="btn">Login</button>
</form>
<div class="error" id="errorMsg"></div>
<p class="auto-login">Auto-login will start in 1 second...</p>
</div>

<script>
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.get('username'), password: formData.get('password') })
        });
        const data = await res.json();
        if (res.ok && data.user) {
            localStorage.setItem('db-token', data.user.token);
            window.location.href = '/dashboard';
        } else {
            document.getElementById('errorMsg').textContent = data.error || 'Login failed';
        }
    } catch (err) { console.error(err); }
};

setTimeout(async () => {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
        });
        const data = await res.json();
        if (res.ok && data.user) {
            localStorage.setItem('db-token', data.user.token);
            window.location.href = '/dashboard';
        }
    } catch (e) { console.error(e); }
}, 500);
</script>
</body>
</html>`);
}

function serveDashboard(res) {
    fetch('/api/db/users').then(async r => {
        if (!r.ok) throw new Error('Failed to fetch users');
        const data = await r.json();
        
        const usersHTML = data.users.map(u => 
            `<tr>
                <td>${u.id}</td>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td>${escapeHtml(u.name) || '-'}</td>
                <td>${new Date(u.createdAt).toLocaleString()}</td>
            </tr>`
        ).join('');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dashboard - db.local</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#334}
.header{display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:2px solid #667eea;margin-bottom:2rem}
.header h1{margin:0;color:#333}
.header a{color:#667eea;text-decoration:none}
.container{max-width:1200px;margin:0 auto;padding:2rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem}
.stat-card{background:white;padding:1.5rem;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}
.stat-card h3{margin:0;font-size:2rem;color:#667eea}
.stat-card p{margin:0.3rem 0 0;color:#666}
.table-container{background:white;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);overflow:hidden}
.table{width:100%;border-collapse:collapse}
.th,td{padding:1rem;text-align:left;border-bottom:1px solid #e2e8f0}
.th{background:#f8fafc;font-weight:600;color:#666}
.btn-danger{background:#ef4444;color:white;padding:0.5rem 1rem;border:none;border-radius:6px;cursor:pointer}
</style>
</head>
<body>
<div class="header">
<h1>🗄️ Database Dashboard - db.local</h1>
<a href="/logout" style="color:#667eea;font-weight:500;">Logout</a>
</div>

<div class="container">
<div class="stats">
<div class="stat-card">
<h3 id="userCount">${data.users.length}</h3>
<p>Total Users</p>
</div>
</div>

<div class="table-container">
<table class="table">
<thead>
<tr class="th"><td>ID</td><td>Username</td><td>Name</td><td>Created</td></tr>
</thead>
<tbody>${usersHTML}</tbody>
</table>
</div>

<p style="text-align:center;margin-top:2rem;color:#666;font-size:0.9rem;">
Showing all users from SQLite database<br>
Credentials: <strong>admin / admin</strong>
</p>
</div>
</body>
</html>`);
    }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><head><title>Error</title></head><body style="padding:2rem;text-align:center"><h1>Database Error</h1><p>${escapeHtml(err.message)}</p></body></html>`);
    });
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const server = http.createServer(handleRequest);

async function startServer() {
    await initialize();
    console.log('🚀 Server running at http://db.local:8080');
    console.log('🔐 Admin credentials: username=admin / password=admin');
    console.log('📍 Dashboard: http://localhost:8080/dashboard');
    
    server.listen(PORT, '127.0.0.1', () => {
        // Server started successfully
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});