const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(3000, () => {
  console.log('Сайт запущен на http://localhost:3000');
});

const wss = new WebSocket.Server({ server });
const clients = {};

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'register') {
      userId = data.userId;
      clients[userId] = ws;
    } else if (data.targetId && clients[data.targetId]) {
      clients[data.targetId].send(JSON.stringify(data));
    }
  });

  ws.on('close', () => {
    if (userId) delete clients[userId];
  });
});