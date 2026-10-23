require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const livekitRoutes = require('./routes/livekit');
const assignmentRoutes = require('./routes/assignments');
const attendanceRoutes = require('./routes/attendance');
const subjectRoutes = require('./routes/subjects');
const notificationRoutes = require('./routes/notifications');
const { WebhookReceiver } = require('livekit-server-sdk');

const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
];

if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ''));
}
if (process.env.VITE_SIGNALING_SERVER) {
    allowedOrigins.push(process.env.VITE_SIGNALING_SERVER.replace(/\/$/, ''));
}

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, '');
        if (allowedOrigins.indexOf(normalizedOrigin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));

// --- LiveKit Webhook Handler (MUST BE BEFORE express.json()) ---
const receiver = new WebhookReceiver(
    process.env.LIVEKIT_API_KEY || '',
    process.env.LIVEKIT_API_SECRET || ''
);

app.post('/api/livekit/webhook', express.raw({ type: '*/*' }), async (req, res) => {
    try {
        const authHeader = req.get('Authorization');
        const rawBody = req.body.toString('utf-8');
        const event = await receiver.receive(rawBody, authHeader);
        
        console.log('LiveKit Event:', event.event, event.room?.name);

        if (event.event === 'participant_joined') {
            if (event.participant?.identity && event.room?.name) {
                if (typeof attendanceRoutes.recordJoin === 'function') {
                    attendanceRoutes.recordJoin(
                        event.room.name,
                        null,
                        event.participant.identity,
                        'student'
                    );
                }
            }
        } else if (event.event === 'participant_left') {
            const identity = event.participant?.identity;
            if (identity && event.room?.name) {
                if (typeof attendanceRoutes.recordLeave === 'function') {
                    attendanceRoutes.recordLeave(event.room.name, identity);
                }
            }

            if (event.room?.name && rooms[event.room.name]) {
                const initialCount = rooms[event.room.name].length;
                rooms[event.room.name] = rooms[event.room.name].filter(u => u.name !== identity);
                if (rooms[event.room.name].length < initialCount) {
                    io.to(event.room.name).emit('user-left-fallback', identity);
                }
            }
        }

        res.status(200).send('ok');
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.status(400).send('error');
    }
});

// Standard JSON parser for all remaining routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Database Connection ---
if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI not provided in environment variables.');
}

mongoose.connect(process.env.MONGODB_URI || '')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        console.warn('Proceeding without MongoDB. Persistence features will fail.');
    });

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Static Frontend Files & Fallback ---
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', mode: process.env.NODE_ENV || 'development' });
});

// SPA Catch-all: Excludes /api requests (Express 5 syntax)
app.get('{/*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(404).send('Frontend build not found.');
    }
});

// --- WebSockets ---
const rooms = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userData) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = [];
        const newUser = { id: socket.id, ...userData };
        if (!rooms[roomId].find(u => u.id === socket.id)) {
            rooms[roomId].push(newUser);
        }
    });

    socket.on('signal', (payload) => {
        io.to(payload.to).emit('signal', {
            signal: payload.signal,
            from: socket.id
        });
    });

    socket.on('chat-message', (roomId, message) => {
        socket.to(roomId).emit('chat-message', message);
    });

    socket.on('reaction', (roomId, emoji) => {
        socket.to(roomId).emit('reaction', emoji);
    });

    socket.on('end-session', (data) => {
        io.emit('session-ended', data);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
            socket.to(roomId).emit('user-left', socket.id);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});