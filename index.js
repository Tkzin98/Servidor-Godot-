import { WebSocketServer } from 'ws';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração inicial
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health Check (obrigatório para Render.com)
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

// Inicia servidor HTTP
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Configuração do WebSocket
const wss = new WebSocketServer({ server });
const players = new Map();

// Heartbeat (evita timeout)
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log(`💀 Desconectando jogador inativo: ${ws.playerId}`);
            players.delete(ws.playerId);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // 30 segundos

// Eventos do WebSocket
wss.on('connection', (ws) => {
    const playerId = generateId();
    ws.playerId = playerId;
    ws.isAlive = true;

    // Configura spawn inicial
    const spawnPoint = getRandomSpawn();
    players.set(playerId, {
        position: spawnPoint,
        rotation: spawnPoint.rotation
    });

    console.log(`🎮 Novo jogador conectado: ${playerId}`);

    // Envia dados iniciais
    ws.send(JSON.stringify({
        type: 'init',
        playerId,
        spawn: spawnPoint,
        players: Object.fromEntries(players)
    }));

    // Notifica outros jogadores
    broadcast({
        type: 'player_connected',
        playerId,
        ...spawnPoint
    }, ws);

    // Event listeners
    ws.on('pong', () => ws.isAlive = true);
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'player_update') {
                players.set(playerId, {
                    position: message.position,
                    rotation: message.rotation
                });
                broadcast({
                    type: 'player_update',
                    playerId,
                    ...message
                }, ws);
            }
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    });

    ws.on('close', () => {
        players.delete(playerId);
        broadcast({
            type: 'player_disconnected',
            playerId
        });
        console.log(`🚪 Jogador desconectado: ${playerId}`);
    });
});

// Funções auxiliares
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

function getRandomSpawn() {
    const spawnPoints = [
        { x: 0, y: 0, z: 0, rotation: 0 },
        { x: 5, y: 0, z: 5, rotation: Math.PI / 2 },
        { x: -5, y: 0, z: -5, rotation: Math.PI }
    ];
    return spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
}

function broadcast(data, exclude = null) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Encerramento limpo
process.on('SIGTERM', () => {
    clearInterval(heartbeatInterval);
    wss.close();
    server.close();
});
