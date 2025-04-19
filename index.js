const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    console.log('Mensagem recebida:', msg);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });
});
