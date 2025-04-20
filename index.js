const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.id = uuidv4(); // ID único pra cada jogador

  ws.on('message', (msg) => {
    // Reenvia para todos (menos ele)
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });
});
