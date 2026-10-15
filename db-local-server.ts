import { login, ensureAdmin, validateAdmin } from './src/auth';
import http from 'http';

const PORT = 8080;

// In-memory user sessions (use Redis in production)
const activeSessions = new Map();

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }));
  }

  const token = authHeader.split(' ')[1];
  
  // Check against known sessions
  const session = activeSessions.get(token);
  if (!session) {
    return res.writeHead(403).end(JSON.stringify({ error: 'Invalid token' }));
  }

  // Check if session is still valid
  const now = Date.now();
  if (now > session.expiry) {
    activeSessions.delete(token);
    return res.writeHead(401).end(JSON.stringify({ error: 'Session expired' }));
  }

  req.user = session.user;
  next();
}

// Serve login page
function serveLogin(res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TypeScript Auth Database - Login</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
        }
        h1 { color: #333; margin-bottom: 0.5rem; text-align: center; font-size: 1.8rem;}
        .subtitle { color: #666; text-align: center; margin-bottom: 2rem; }
        form label { display: block; margin-bottom: 0.5rem; color: #555; font-weight: 500; }
        form input {
            width: 100%;
            padding: 0.8rem;
            margin-bottom: 1rem;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 1rem;
        }
        form input:focus { outline: none; border-color: #667eea; }
        .error { color: #dc3545; margin-bottom: 1rem; padding: 0.5rem; background: #f8d7da; border-radius: 5px; display: none; }
        button {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        .features { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e9ecef; }
        .features h3 { color: #667eea; margin-bottom: 0.5rem; font-size: 1rem;}
        .features ul { list-style: none; padding-left: 0; }
        .features li { margin-bottom: 0.5rem; color: #666; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 TypeScript Auth Database</h1>
        <p class="subtitle">Login to manage your data</p>
        
        <form id="loginForm">
            <label for="email"><strong>Email</strong></label>
            <input type="email" id="email" name="email" placeholder="Enter your email" required value="admin">
            
            <label for="password"><strong>Password</strong></label>
            <input type="password" id="password" name="password" placeholder="Enter password" required value="admin123">
            
            <div class="error" id="errorMsg"></div>
            <button type="submit">Login</button>
        </form>
        
        <div class="features">
            <h3>System Features:</h3>
            <ul>
                <li>TypeScript authentication</li>
                <li>bCrypt password security</li>
                <li>Prisma ORM database</li>
            </ul>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('authToken', data.user.token);
                    localStorage.setItem('userId', data.user.id);
                    alert('Login successful! Redirecting...');
                    window.location.href = '/';
                } else {
                    document.getElementById('errorMsg').textContent = data.error || 'Login failed';
                    document.getElementById('errorMsg').style.display = 'block';
                }
            } catch (err) {
                document.getElementById('errorMsg').textContent = 'Connection error';
                document.getElementById('errorMsg').style.display = 'block';
            }
        });

        // Auto-login with default credentials on first visit
        fetch('/api/auth/check', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.user) {
                    localStorage.setItem('authToken', data.user.token);
                    window.location.href = '/';
                }
            });
    </script>
</body>
</html>
`);
}

// Serve protected page
function serveProtectedPage(res, user) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TypeScript Auth Database - Protected</title>
    <style>body{font-family:sans-serif;background:#667eea;color:white;text-align:center;padding:50px;}h1{margin-bottom:20px;font-size:2.5rem;}</style>
</head>
<body>
    <h1>🎉 Welcome, ${user.name || 'User'}!</h1>
    <p>You have successfully logged in.</p>
    <button onclick="logout()">Logout</button>
</body>
</html>
`);
}

// API routes
function setupAPI(res) {
  // Health check (public)
  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'db.local', timestamp: new Date().toISOString() }));
    return;
  }

  // Login (public)
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = JSON.parse(req.body);
    const result = login(email, password);
    
    setTimeout(() => {
        if (result.success) {
            const token = `Bearer ${result.user.token}`;
            activeSessions.set(token, { user: result.user, expiry: Date.now() + 3600000 });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...result, token }));
        } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        }
    }, 0);
    return;
  }

  // Check session (public)
  if (req.url === '/api/auth/check' && req.method === 'POST') {
    const result = ensureAdmin();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...result }));
    return;
  }

  // Protected route example (requires auth)
  if (req.url === '/api/auth/protected' && req.method === 'GET') {
    authenticate(req, res, () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Hello ${req.user.email}`, protected: true }));
    });
    return;
  }

  // Homepage (protected)
  if (req.url === '/' && req.method === 'GET') {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      serveLogin(res);
      return;
    }

    authenticate(req, res, () => {
      if (!activeSessions.has(token)) {
        serveLogin(res);
        return;
      }

      const session = activeSessions.get(token);
      if (Date.now() > session.expiry) {
        activeSessions.delete(token);
        serveLogin(res);
        return;
      }

      serveProtectedPage(res, session.user);
    });
    return;
  }

  // Default: redirect to login or homepage
  if (req.method === 'GET') {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token || !activeSessions.has(token)) {
      serveLogin(res);
    } else {
      serveProtectedPage(res, activeSessions.get(token).user);
    }
  }
}

// Start server
const server = http.createServer((req, res) => {
  if (['GET', 'POST'].includes(req.method)) {
    setupAPI(res);
    return;
  }

  // Serve static files
  const filePath = new URL(req.url, `http://localhost:${PORT}`).pathname === '/' ? '/index.html' : req.url;
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
<!DOCTYPE html>
<html><head><title>TypeScript Auth Database</title>
<style>body{font-family:sans-serif;text-align:center;padding:50px;background:#667eea;color:white;}h1{font-size:2.5rem;}</style></head>
<body>
<h1>🚀 TypeScript Auth Database</h1>
<p>Server running at <code>http://db.local:${PORT}</code></p>
<a href="/login" style="color:white;margin-top:20px;display:inline-block;padding:10px 20px;background:rgba(255,255,255,0.2);border-radius:5px;text-decoration:none;">Login</a>
</body></html>
`);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Server running at http://db.local:${PORT}`);
  console.log(`🔐 Admin login: admin / admin123`);
  console.log(`📍 Protected page: http://localhost:${PORT}/api/auth/protected`);
});
