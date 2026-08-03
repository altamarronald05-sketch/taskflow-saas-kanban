/* ==========================================================================
   TaskFlow SaaS | Full-Stack REST API Server with User Auth & DB Isolation
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure directory and JSON DB files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initDBFile(filepath, defaultData = []) {
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
}

initDBFile(USERS_FILE, []);
initDBFile(TASKS_FILE, []);
initDBFile(SESSIONS_FILE, {});

// Helper DB Read/Write
function readJSON(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        return [];
    }
}

function writeJSON(filepath, data) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('Error al escribir JSON:', err);
        return false;
    }
}

// Password Hashing Helper (SHA-256 with Salt)
function hashPassword(password, salt = 'taskflow_secret_salt_2026') {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Helper: Parse Request Body
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
}

// Session Authenticator Middleware
function getAuthenticatedUser(req) {
    const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
    let token = authHeader;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    if (!token) {
        // Check query string for CSV export download URL
        const parsedUrl = url.parse(req.url, true);
        token = parsedUrl.query.token;
    }

    if (!token) return null;

    const sessions = readJSON(SESSIONS_FILE);
    const userId = sessions[token];
    if (!userId) return null;

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);
    return user || null;
}

// Mime types dictionary
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Create HTTP Server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-token');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Helper Response Functions
    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const sendError = (statusCode, message) => {
        sendJSON(statusCode, { error: message });
    };

    // =========================================================================
    // 🔐 AUTHENTICATION ENDPOINTS
    // =========================================================================

    // POST /api/auth/register
    if (pathname === '/api/auth/register' && method === 'POST') {
        try {
            const body = await parseRequestBody(req);
            const { name, email, password } = body;

            if (!name || !email || !password) {
                return sendError(400, 'Todos los campos son obligatorios (Nombre, Email, Contraseña).');
            }

            if (password.length < 6) {
                return sendError(400, 'La contraseña debe tener al menos 6 caracteres.');
            }

            const users = readJSON(USERS_FILE);
            const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (existingUser) {
                return sendError(400, 'Ya existe una cuenta registrada con este correo electrónico.');
            }

            const newUser = {
                id: 'usr_' + Date.now(),
                name: name.trim(),
                email: email.trim().toLowerCase(),
                passwordHash: hashPassword(password),
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            writeJSON(USERS_FILE, users);

            // Create Session Token
            const token = crypto.randomBytes(32).toString('hex');
            const sessions = readJSON(SESSIONS_FILE);
            sessions[token] = newUser.id;
            writeJSON(SESSIONS_FILE, sessions);

            return sendJSON(201, {
                message: 'Usuario registrado con éxito',
                token,
                user: { id: newUser.id, name: newUser.name, email: newUser.email }
            });
        } catch (err) {
            return sendError(400, 'Solicitud de registro inválida.');
        }
    }

    // POST /api/auth/login
    if (pathname === '/api/auth/login' && method === 'POST') {
        try {
            const body = await parseRequestBody(req);
            const { email, password } = body;

            if (!email || !password) {
                return sendError(400, 'Ingresa tu correo y contraseña.');
            }

            const users = readJSON(USERS_FILE);
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!user || user.passwordHash !== hashPassword(password)) {
                return sendError(401, 'Credenciales incorrectas. Verifica tu correo o contraseña.');
            }

            // Create Session Token
            const token = crypto.randomBytes(32).toString('hex');
            const sessions = readJSON(SESSIONS_FILE);
            sessions[token] = user.id;
            writeJSON(SESSIONS_FILE, sessions);

            return sendJSON(200, {
                message: 'Inicio de sesión exitoso',
                token,
                user: { id: user.id, name: user.name, email: user.email }
            });
        } catch (err) {
            return sendError(400, 'Petición de inicio de sesión inválida.');
        }
    }

    // GET /api/auth/me
    if (pathname === '/api/auth/me' && method === 'GET') {
        const currentUser = getAuthenticatedUser(req);
        if (!currentUser) {
            return sendError(401, 'Sesión expirada o no autorizada.');
        }
        return sendJSON(200, {
            user: { id: currentUser.id, name: currentUser.name, email: currentUser.email }
        });
    }

    // POST /api/auth/logout
    if (pathname === '/api/auth/logout' && method === 'POST') {
        const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
        let token = authHeader;
        if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);

        if (token) {
            const sessions = readJSON(SESSIONS_FILE);
            delete sessions[token];
            writeJSON(SESSIONS_FILE, sessions);
        }
        return sendJSON(200, { message: 'Sesión cerrada correctamente.' });
    }

    // GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
        return sendJSON(200, { status: 'online', uptime: process.uptime(), timestamp: new Date() });
    }

    // =========================================================================
    // 📋 TASK MANAGEMENT ENDPOINTS (USER ISOLATED)
    // =========================================================================

    // Protect all /api/tasks endpoints
    const currentUser = getAuthenticatedUser(req);

    if (pathname.startsWith('/api/tasks') || pathname.startsWith('/api/export')) {
        if (!currentUser) {
            return sendError(401, 'Debes iniciar sesión para acceder a tus tareas.');
        }
    }

    // GET /api/tasks
    if (pathname === '/api/tasks' && method === 'GET') {
        const allTasks = readJSON(TASKS_FILE);
        const userTasks = allTasks.filter(t => t.userId === currentUser.id);
        return sendJSON(200, userTasks);
    }

    // POST /api/tasks
    if (pathname === '/api/tasks' && method === 'POST') {
        try {
            const body = await parseRequestBody(req);

            if (!body.title) {
                return sendError(400, 'El título de la tarea es requerido.');
            }

            const allTasks = readJSON(TASKS_FILE);
            const newTask = {
                id: Date.now(),
                userId: currentUser.id,
                title: body.title.trim(),
                desc: (body.desc || '').trim(),
                priority: body.priority || 'Media',
                category: body.category || 'Frontend',
                status: body.status || 'todo',
                dueDate: body.dueDate || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            };

            allTasks.unshift(newTask);
            writeJSON(TASKS_FILE, allTasks);

            return sendJSON(201, newTask);
        } catch (err) {
            return sendError(400, 'Error al crear la tarea.');
        }
    }

    // PUT /api/tasks/:id
    if (pathname.startsWith('/api/tasks/') && method === 'PUT') {
        const id = parseInt(pathname.split('/')[3]);
        try {
            const body = await parseRequestBody(req);
            const allTasks = readJSON(TASKS_FILE);
            const index = allTasks.findIndex(t => t.id === id && t.userId === currentUser.id);

            if (index === -1) {
                return sendError(404, 'Tarea no encontrada o no tienes permisos para editarla.');
            }

            allTasks[index] = {
                ...allTasks[index],
                ...body,
                updatedAt: new Date().toISOString()
            };

            writeJSON(TASKS_FILE, allTasks);
            return sendJSON(200, allTasks[index]);
        } catch (err) {
            return sendError(400, 'Error al actualizar la tarea.');
        }
    }

    // DELETE /api/tasks/:id
    if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
        const id = parseInt(pathname.split('/')[3]);
        let allTasks = readJSON(TASKS_FILE);
        const initialLen = allTasks.length;

        allTasks = allTasks.filter(t => !(t.id === id && t.userId === currentUser.id));

        if (allTasks.length === initialLen) {
            return sendError(404, 'Tarea no encontrada o no pertenece a tu usuario.');
        }

        writeJSON(TASKS_FILE, allTasks);
        return sendJSON(200, { message: 'Tarea eliminada exitosamente.', id });
    }

    // GET /api/export/csv
    if (pathname === '/api/export/csv' && method === 'GET') {
        const allTasks = readJSON(TASKS_FILE);
        const userTasks = allTasks.filter(t => t.userId === currentUser.id);

        let csv = 'ID,Título,Descripción,Prioridad,Categoría,Estado,Fecha Límite\n';
        userTasks.forEach(t => {
            csv += `${t.id},"${(t.title||'').replace(/"/g, '""')}","${(t.desc||'').replace(/"/g, '""')}",${t.priority},${t.category},${t.status},${t.dueDate}\n`;
        });

        res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="TaskFlow_${currentUser.name.replace(/\s+/g, '_')}_Report.csv"`
        });
        return res.end(csv);
    }

    // Static Files Serving
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>404 Not Found</h1><p>Recurso no encontrado en el servidor.</p>');
            } else {
                res.writeHead(500);
                res.end(`Error de servidor: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 TaskFlow SaaS Full-Stack REST & Auth Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔐 Auth Endpoints: /api/auth/login | /api/auth/register`);
    console.log(`====================================================`);
});
