const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws'); // برای اتصال WebSocket خارجی
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json()); // پشتیبانی از JSON برای درخواست‌ها

// ایجاد سرور HTTP
const server = http.createServer(app);

// ایجاد Socket.IO با تنظیمات CORS
const io = new Server(server, {
    cors: {
        origin: '*', // اجازه دسترسی از همه دامنه‌ها
        methods: ['GET', 'POST'], // روش‌های مجاز
        allowedHeaders: ['Content-Type'], // هدرهای مجاز
        credentials: true // اگر احراز هویت نیاز است
    }
});

// مدیریت اتصالات کلاینت‌ها
io.on('connection', (socket) => {
    console.log(`کاربر متصل شد: ${socket.id}`);

    // پیوستن به کانال
    socket.on('join_channel', (channel) => {
        if (channel) {
            socket.join(channel);
            console.log(`کاربر ${socket.id} به کانال ${channel} پیوست`);
        }
    });

    // ارسال پیام به کانال
    socket.on('send_message', ({ channel, message }) => {
        if (channel && message) {
            console.log(`ارسال پیام به کانال ${channel}:`, message);
            io.to(channel).emit('receive_message', message);
        } else {
            console.log('درخواست نامعتبر برای ارسال پیام:', { channel, message });
        }
    });

    // هنگام قطع اتصال
    socket.on('disconnect', () => {
        console.log(`کاربر ${socket.id} قطع اتصال کرد`);
    });
});

// Endpoint برای دریافت داده‌های Traccar و ارسال به کانال `event`
app.post('/events', (req, res) => {
    const data = req.body;

    // ارسال همه پیام‌ها به کانال `event`
    io.to('events').emit('new_event', data);

    // پاسخ موفقیت‌آمیز
    res.status(200).send({ status: 'success', message: 'Event broadcasted successfully.' });
});

// Endpoint برای دریافت داده‌های broadcast و ارسال به کانال‌های مشخص شده
app.post('/broadcast', (req, res) => {
    const { channel, event, message } = req.body;

    if (channel && event && message) {
        console.log(`دریافت پیام برای کانال ${channel}:`, message);

        // ارسال پیام به کانال مشخص شده
        io.to(channel).emit(event, message);

        res.status(200).send({ status: 'success', message: 'Message broadcasted successfully.' });
    } else {
        console.log('درخواست نامعتبر برای /broadcast:', req.body);
        res.status(400).send({ status: 'error', message: 'Invalid request payload.' });
    }
});

// اتصال به WebSocket خارجی
const wsUrl = 'ws://185.164.72.86:8089/api/socket?token=RzBFAiAQynwqdT92TRp1ZjyvMoHOiP-k5-6C-fdv7mP7KlrPugIhAJZXhiv-o-57kNdtZn_dWb0DFxcVkWfYxizjrWrIE_2leyJ1IjozLCJlIjoiMjAzMC0wMS0xMlQyMDozMDowMC4wMDArMDA6MDAifQ';
const externalSocket = new WebSocket(wsUrl);

externalSocket.on('open', () => {
    console.log('WebSocket connection to external server established.');
});

externalSocket.on('message', (message) => {
    console.log('پیام دریافتی از WebSocket خارجی:', message);

    // ارسال پیام به کانال `positions` در Socket.IO
    io.to('positions').emit('update_position', JSON.parse(message));
});

externalSocket.on('error', (error) => {
    console.error('خطای WebSocket خارجی:', error.message);
});

externalSocket.on('close', (code) => {
    console.log(`WebSocket connection closed with code: ${code}`);
});

// اجرای سرور روی پورت 3000
server.listen(3000, () => {
    console.log('سرور Socket.IO روی پورت 3000 در حال اجرا است');
});
