const WebSocket = require("ws");

const PORT = process.env.PORT || 10000;
const server = new WebSocket.Server({ port: PORT });

let clients = [];

server.on("connection", socket => {
    console.log("Cliente conectado");
    clients.push(socket);

    socket.on("message", msg => {
        console.log("Mensagem recebida:", msg.toString());
        for (const client of clients) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        }
    });

    socket.on("close", () => {
        clients = clients.filter(c => c !== socket);
        console.log("Cliente desconectado");
    });
});
