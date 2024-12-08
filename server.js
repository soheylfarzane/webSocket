const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // برای ارسال درخواست به وب‌هوک

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
    io.to('event').emit('new_event', data);

    // بررسی نوع پیام و ارسال به وب‌هوک اگر نوع پیام غیر از online و offline باشد
    if (data.type !== 'deviceOffline' && data.type !== 'deviceOnline') {
        fetch('https://goldenbat.app/api/v2/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
            .then((response) => {
                if (response.ok) {
                    console.log('پیام با موفقیت به وب‌هوک ارسال شد:', data);
                } else {
                    console.error('خطا در ارسال پیام به وب‌هوک:', response.statusText);
                }
            })
            .catch((error) => {
                console.error('خطا در هنگام ارتباط با وب‌هوک:', error.message);
            });
    }

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

// اجرای سرور روی پورت 3000
server.listen(3000, () => {
    console.log('سرور Socket.IO روی پورت 3000 در حال اجرا است');
});
