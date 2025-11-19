import { WebSocketServer } from "ws"
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';


const __filename = "wsChatNew";
const __dirname = path.dirname(__filename);

const usersFile = path.join(__dirname, 'users.json');

const HOSTNAME = '0.0.0.0';
const PORT = 8080;

// ####################################################################################################

const server = createServer((req, res) => {
    if (req.url === '/') {
        const index = fs.readFileSync(path.join(__dirname, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(index);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocketServer({
    server,
    path: '/chat'
});

// ####################################################################################################

wss.on('connection', (ws, request) => {
    ws.username = null;

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        const users = loadUsers();

        switch (data.type) {
            case 'signup':
                if (users[data.username]) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'User exists' 
                    }));
                    return;
                }

                users[data.username] = { password: hash(data.password) };
                saveUsers(users);

                ws.username = data.username;
                ws.send(JSON.stringify({
                    type: 'auth',
                    success: true,
                    username: data.username
                }));
                console.log(`user joined: ${ws.username}`);
                break;

            case 'login':
                if (ws.username !== null) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Already logged in'
                    }));
                    return;
                }

                else if (!users[data.username] || users[data.username].password !== hash(data.password)) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid creds'
                    }));
                    return;
                }
                /*
                else {
                    const tmp = false
                    const client_size = wss.clients.size();
                    for (let i = 0; i < client_size; i++) {
                        if (wss.clients[i].username === ws.username) {
                            return;
                        }
                    } 
                }
                */

                ws.username = data.username;
                ws.send(JSON.stringify({
                    type: 'auth',
                    success: true,
                    username: data.username
                }));
                console.log(`user joined: ${ws.username}`);
                break;

            case 'logout':
                console.log(`user left: ${data.username}`);
                ws.username = null;
                ws.send(JSON.stringify({ type: 'auth', success: false }));
                break;

            case 'message':
                if (!ws.username) return;
                console.log(`${ws.username}: ${data.message}`);
                const payload = JSON.stringify({
                    type: 'message',
                    user: ws.username,
                    message: data.message
                });
                wss.clients.forEach(c => c.username != ws.username ? c.send(payload) : null);
                break;
        }
    });
});

// Utility: load users
function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    } catch (e) {
        return {};
    }
}

// Utility: save users
function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Hash password
function hash(str, seed = 1) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// ####################################################################################################

// Start server
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`You can test with: ws://0.0.0.0:${PORT}/chat`);
    console.log(`You can connet to: http://0.0.0.0:${PORT}`);
});