const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
});

// Endpoint برای دریافت پیام از PHP
app.post('/broadcast', (req, res) => {
    const { channel, event, message } = req.body;

    if (channel && event && message) {
        io.to(channel).emit(event, message);
        console.log(`Message sent to channel ${channel}:`, message);
        res.status(200).send({ status: 'success', message: 'Message broadcasted successfully.' });
    } else {
        res.status(400).send({ status: 'error', message: 'Invalid request payload.' });
    }
});

server.listen(3000, () => {
    console.log('Socket.IO server is running on port 3000');
});
