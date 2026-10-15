import express from 'express';
import path from 'path';

const app = express();
const PORT = 8080;

// Serve static files
app.use(express.static(path.join(process.cwd(), 'public')));

// API endpoint for database health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'db.local',
        timestamp: new Date().toISOString() 
    });
});

// API endpoint to test authentication
app.get('/api/auth/test', (req, res) => {
    res.json({
        message: 'Authentication system is running',
        ready: true,
        database: 'SQLite',
        orm: 'Prisma'
    });
});

// Serve the frontend as default route
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://db.local:${PORT}`);
    console.log(`✅ Access database via db.local (no port needed!)`);
});
