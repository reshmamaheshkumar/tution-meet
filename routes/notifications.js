const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const Notification = require('../models/Notification');

// Get user's notifications (paginated)
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('senderId', 'name');

        const unreadCount = await Notification.countDocuments({
            userId: req.user.id,
            read: false
        });

        res.json({ notifications, unreadCount, page, limit });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

// Send notification to specific users (teacher only)
router.post('/send', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const { userIds, type, title, message, link } = req.body;

        if (!userIds || !userIds.length) {
            return res.status(400).json({ message: 'userIds array is required' });
        }

        const notifications = userIds.map(userId => ({
            userId,
            type: type || 'announcement',
            title,
            message,
            link: link || '',
            senderId: req.user.id
        }));

        await Notification.insertMany(notifications);
        res.status(201).json({ message: `${notifications.length} notifications sent` });
    } catch (err) {
        res.status(500).json({ message: 'Error sending notifications' });
    }
});

// Helper: Broadcast notification to all students of a subject (used internally)
router.broadcastToSubject = async (subjectId, senderId, type, title, message, link) => {
    try {
        const Subject = require('../models/Subject');
        const subject = await Subject.findById(subjectId);

        if (!subject || !subject.enrolledStudents.length) return;

        const notifications = subject.enrolledStudents.map(studentId => ({
            userId: studentId,
            type,
            title,
            message,
            link: link || '',
            senderId
        }));

        await Notification.insertMany(notifications);
        return notifications.length;
    } catch (err) {
        console.error('Error broadcasting notifications:', err);
    }
};

module.exports = router;
