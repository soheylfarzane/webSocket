
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json()); // برای پردازش درخواست‌های JSON

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// مدیریت اتصال کاربران
io.on('connection', (socket) => {
    console.log(`کاربر جدید متصل شد: ${socket.id}`);

    // عضویت در کانال
    socket.on('join_channel', (channel) => {
        socket.join(channel);
        console.log(`کاربر ${socket.id} به کانال ${channel} پیوست`);
    });

    // ارسال پیام به یک کانال
    socket.on('send_message', ({ channel, message }) => {
        io.to(channel).emit('receive_message', message);
        console.log(`پیام به کانال ${channel}:`, message);
    });

    // قطع اتصال
    socket.on('disconnect', () => {
        console.log(`کاربر ${socket.id} قطع شد`);
    });
});

// راه‌اندازی سرور
server.listen(3000, () => {
    console.log('سرور WebSocket روی پورت 3000 اجرا شد');
});
