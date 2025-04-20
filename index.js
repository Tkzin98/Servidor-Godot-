const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuração para Render
const PORT = process.env.PORT || 3000;

// Objeto para armazenar os jogadores conectados
let players = {};

io.on('connection', (socket) => {
  console.log(`Novo jogador conectado: ${socket.id}`);
  
  // Adiciona novo jogador
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    animation: "idle"
  };
  
  // Envia todos os jogadores para o novo cliente
  socket.emit('currentPlayers', players);
  
  // Notifica outros jogadores sobre o novo jogador
  socket.broadcast.emit('newPlayer', players[socket.id]);
  
  // Atualiza posição do jogador
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].position = movementData.position;
      players[socket.id].rotation = movementData.rotation;
      players[socket.id].animation = movementData.animation;
      
      // Envia atualização para todos os outros jogadores
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: players[socket.id].position,
        rotation: players[socket.id].rotation,
        animation: players[socket.id].animation
      });
    }
  });
  
  // Remove jogador quando desconecta
  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
