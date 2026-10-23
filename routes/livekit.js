const express = require('express');
const router = express.Router();
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const auth = require('../middleware/auth');

// Initialize RoomServiceClient
const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
);

router.post('/create-room', auth, async (req, res) => {
    try {
        const { name, empty_timeout, max_participants } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Room name is required' });
        }

        const roomOptions = {
            name: name,
            emptyTimeout: empty_timeout || 10 * 60, // 10 minutes default
            maxParticipants: max_participants || 20,
        };

        const room = await roomService.createRoom(roomOptions);

        res.json({
            message: 'Room created successfully',
            room: {
                name: room.name,
                sid: room.sid
            }
        });
    } catch (err) {
        console.error('Error creating room:', err);
        res.status(500).json({ message: 'Error creating room: ' + err.message });
    }
});

router.get('/list-rooms', auth, async (req, res) => {
    try {
        const rooms = await roomService.listRooms();
        const roomsList = rooms.map(room => ({
            name: room.name,
            sid: room.sid,
            num_participants: room.numParticipants
        }));
        res.json({ rooms: roomsList });
    } catch (err) {
        console.error('Error listing rooms:', err);
        res.status(500).json({ message: 'Error listing rooms: ' + err.message });
    }
});

router.delete('/delete-room', auth, async (req, res) => {
    try {
        const { room } = req.query;
        if (!room) {
            return res.status(400).json({ message: 'Room name is required' });
        }

        await roomService.deleteRoom(room);
        res.json({ message: `Room ${room} deleted successfully` });
    } catch (err) {
        console.error('Error deleting room:', err);
        res.status(500).json({ message: 'Error deleting room: ' + err.message });
    }
});

router.get('/token', auth, async (req, res) => {
    try {
        const { room, username } = req.query;

        if (!room || !username) {
            return res.status(400).json({ message: 'Room and username are required' });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.LIVEKIT_URL;

        if (!apiKey || apiKey === 'devkey' || !apiSecret || apiSecret === 'secret') {
            return res.status(500).json({
                message: 'LiveKit API keys are missing or invalid.'
            });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: username,
        });

        at.addGrant({
            roomJoin: true,
            room: room,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        res.json({
            token: await at.toJwt(),
            url: wsUrl
        });
    } catch (err) {
        console.error('LiveKit token error:', err);
        res.status(500).json({ message: 'Error generating LiveKit token' });
    }
});

module.exports = router;
