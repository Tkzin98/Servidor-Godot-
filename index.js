const WebSocket = require('ws');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware importante
app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

// Health check para evitar suspensão
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const wss = new WebSocket.Server({ 
    server,
    clientTracking: true,
    keepalive: true,
    keepaliveInterval: 30000 // 30 segundos
});

// Sistema de heartbeat
function setupHeartbeat(ws) {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
}

// Verificação periódica
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log(`Desconectando jogador inativo`);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(null, false, true);
    });
}, 45000); // 45 segundos

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    console.log(`Novo jogador conectado: ${playerId}`);
    
    setupHeartbeat(ws);
    
    ws.on('close', () => {
        console.log(`Jogador ${playerId} desconectado`);
    });

    ws.on('error', (error) => {
        console.error(`Erro com jogador ${playerId}:`, error);
    });
});

wss.on('close', () => {
    clearInterval(interval);
});
