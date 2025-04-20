const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do servidor
const SPAWN_POINTS = [
    { x: 0, y: 0, z: 0, rotation: 0 },
    { x: 5, y: 0, z: 5, rotation: 1.57 },
    { x: -5, y: 0, z: -5, rotation: 3.14 },
    { x: -5, y: 0, z: 5, rotation: -1.57 }
];

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

const wss = new WebSocket.Server({ server });

// Estado do jogo
const players = {};

wss.on('connection', (ws) => {
    console.log('Novo jogador conectado');
    
    const playerId = generateId();
    const spawn = getRandomSpawn();
    
    players[playerId] = {
        position: { ...spawn },
        rotation: spawn.rotation,
        lastUpdate: Date.now()
    };
    
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        spawn: spawn,
        players: getAllPlayers()
    }));
    
    broadcast({
        type: 'player_connected',
        playerId: playerId,
        position: players[playerId].position,
        rotation: players[playerId].rotation
    }, ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'player_update') {
                players[playerId].position = data.position;
                players[playerId].rotation = data.rotation;
                players[playerId].lastUpdate = Date.now();
                
                broadcast({
                    type: 'player_update',
                    playerId: playerId,
                    position: data.position,
                    rotation: data.rotation
                }, ws);
            }
        } catch (e) {
            console.error('Erro ao processar mensagem:', e);
        }
    });
    
    ws.on('close', () => {
        console.log(`Jogador ${playerId} desconectado`);
        delete players[playerId];
        broadcast({
            type: 'player_disconnected',
            playerId: playerId
        });
    });
});

// Funções auxiliares
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function getRandomSpawn() {
    return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
}

function getAllPlayers() {
    const result = {};
    for (const id in players) {
        result[id] = {
            position: players[id].position,
            rotation: players[id].rotation
        };
    }
    return result;
}

function broadcast(data, exclude = null) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
