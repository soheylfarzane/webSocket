const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // برای ارسال درخواست به Laravel

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

// Endpoint برای دریافت داده‌های Traccar
app.post('/events', async (req, res) => {
    const data = req.body;

    // ارسال همه پیام‌ها به کانال وب‌سوکت
    io.to('event').emit('new_event', data);

    // بررسی نوع رویداد و ارسال به Laravel
    if (data.type && data.type !== 'deviceOffline' && data.type !== 'deviceOnline') {
        try {
            // ارسال پیام به سرور Laravel
            const response = await fetch('https://goldenbat.app/api/v2/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                console.log('پیام با موفقیت به Laravel ارسال شد:', data);
            } else {
                console.error('خطا در ارسال پیام به Laravel:', await response.text());
            }
        } catch (error) {
            console.error('خطا در هنگام ارتباط با Laravel:', error.message);
        }
    }

    res.status(200).send({ status: 'success', message: 'Event processed successfully.' });
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
