import { WebSocket, WebSocketServer } from "ws"
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOSTNAME = '0.0.0.0';
const PORT = 8080;

const public_files = fs.readdirSync(path.join(__dirname, '/public/'));

// Create HTTP server
const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Security measure - block path traversal attempts
    filePath = public_files.includes(req.url.slice(1, req.url.length)) ? filePath : '/index.html';
    filePath = path.join(__dirname, 'public', filePath);

    // Set proper Content-Type based on file extension
    const extname = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[extname] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});
const wss = new WebSocketServer({ 
    server,
    path: '/chat'
});



// Store connected clients
const clients = new Set();

wss.on('connection', (ws, request) => {
    const clientIP = request.socket.remoteAddress;
    clients.add(ws);

    // Extract client IP (useful for identification)
    console.log('New client connected');
    console.log(`user-${clients.size.toString().padStart(3, '0')}`);

    ws.send(JSON.stringify({
        'type': 'define',
        'user': `user-${clients.size.toString().padStart(3, '0')}`,
        'timestamp': new Date().toISOString()
    }))

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        // console.log(msg);

        if (msg['type'] == `message`) {
            console.log(`${msg.user}: ${msg.message}`)
            broadcast(msg, ws);
        }

    });

    /*
    // Extract client IP (useful for identification)
    const clientIP = request.socket.remoteAddress;
    console.log(`Client connected from: ${clientIP}`);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server!',
        timestamp: new Date().toISOString()
    }));

    // Broadcast to all clients that someone joined


    // Handle messages from client
    ws.on('message', (data) => {
        try {
            const message = data.toString();
            console.log(`Received: ${message}`);

            // Parse if it's JSON, otherwise treat as text
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(message);
            } catch {
                parsedMessage = { type: 'message', content: message };
            }

            // Broadcast to all clients except sender
            broadcast({
                type: 'broadcast',
                from: clientIP,
                content: parsedMessage.content || parsedMessage,
                timestamp: new Date().toISOString()
            }, ws);

        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);

        // Broadcast that user left
        broadcast({
            type: 'user_left',
            message: `User left (${clientIP})`,
            timestamp: new Date().toISOString()
        });
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
    */
});

// Broadcast message to all connected clients
function broadcast(message, excludeClient = null) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// Start server
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`You can test with: ws://0.0.0.0:${PORT}/chat`);
    console.log(`You can connet to: http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    broadcast({
        type: 'server_shutdown',
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
    });

    wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
    });
});