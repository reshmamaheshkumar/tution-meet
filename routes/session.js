const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SessionData = require('../models/SessionData');

// Save or Update Session Data (Highlights/Action Items)
router.post('/sync', auth, async (req, res) => {
    try {
        const { roomId, highlights, actionItems, chatHistory, title } = req.body;

        // Basic server-side sanitization
        const sanitize = (str) => typeof str === 'string' ? str.replace(/[<>]/g, '') : str;

        const sanitizedHighlights = highlights?.map(h => ({
            ...h,
            note: sanitize(h.note),
            title: sanitize(h.title)
        }));

        const sanitizedChat = chatHistory?.map(c => ({
            ...c,
            text: sanitize(c.text)
        }));

        let session = await SessionData.findOne({ roomId });

        if (session) {
            if (sanitizedHighlights) session.highlights = sanitizedHighlights;
            if (actionItems) session.actionItems = actionItems;
            if (sanitizedChat) session.chatHistory = sanitizedChat;
            if (title) session.title = title;
            await session.save();
        } else {
            session = new SessionData({
                roomId,
                teacherId: req.user.id,
                highlights: sanitizedHighlights,
                actionItems,
                chatHistory: sanitizedChat,
                title
            });
            await session.save();
        }

        res.json(session);
    } catch (err) {
        res.status(500).json({ message: 'Error syncing session data' });
    }
});

// Get Session Data
router.get('/:roomId', auth, async (req, res) => {
    try {
        const session = await SessionData.findOne({ roomId: req.params.roomId });
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }
        res.json(session);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching session data' });
    }
});

module.exports = router;
