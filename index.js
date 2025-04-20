const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração de spawn points
const SPAWN_POINTS = [
    { x: 0, y: 0, z: 0, rotation: 0 },
    { x: 5, y: 0, z: 5, rotation: 1.57 },
    { x: -5, y: 0, z: -5, rotation: 3.14 }
];

// Middleware e health check
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.status(200).send('OK'));

const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const wss = new WebSocket.Server({ server });
const players = {};

// Heartbeat para manter conexões ativas
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('connection', (ws) => {
    const playerId = generateId();
    const spawn = getRandomSpawn();
    
    players[playerId] = {
        position: spawn,
        rotation: spawn.rotation,
        lastUpdate: Date.now()
    };
    
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);
    
    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        spawn,
        players: getAllPlayers()
    }));
    
    broadcast({
        type: 'player_connected',
        playerId,
        position: spawn,
        rotation: spawn.rotation
    }, ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'player_update') {
                players[playerId] = {
                    position: data.position,
                    rotation: data.rotation,
                    lastUpdate: Date.now()
                };
                broadcast({
                    type: 'player_update',
                    playerId,
                    position: data.position,
                    rotation: data.rotation
                }, ws);
            }
        } catch (e) {
            console.error('Erro ao processar mensagem:', e);
        }
    });
    
    ws.on('close', () => {
        delete players[playerId];
        broadcast({ type: 'player_disconnected', playerId });
    });
});

// Funções auxiliares
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function getRandomSpawn() {
    return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
}

function getAllPlayers() {
    return Object.fromEntries(
        Object.entries(players).map(([id, player]) => [id, {
            position: player.position,
            rotation: player.rotation
        }])
}

function broadcast(data, exclude = null) {
    wss.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}
