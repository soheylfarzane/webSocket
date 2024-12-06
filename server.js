const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json()); // پشتیبانی از JSON برای درخواست‌ها

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // اجازه اتصال از هر منبع
        methods: ['GET', 'POST']
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

// Endpoint برای دریافت داده‌های Traccar و ارسال به کانال `positions`
app.post('/positions', (req, res) => {
    const data = req.body;

    if (data && Object.keys(data).length > 0) {
        console.log('دریافت داده‌های Traccar:', data);

        // ارسال داده به کانال `positions`
        io.to('positions').emit('update_position', data);

        res.status(200).send({ status: 'success', message: 'Position broadcasted to channel.' });
    } else {
        console.log('درخواست نامعتبر برای /positions:', req.body);
        res.status(400).send({ status: 'error', message: 'Invalid request payload.' });
    }
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

// اجرای سرور روی پورت 3000
server.listen(3000, () => {
    console.log('سرور Socket.IO روی پورت 3000 در حال اجرا است');
});
