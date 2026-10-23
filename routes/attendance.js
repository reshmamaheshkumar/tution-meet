const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const Attendance = require('../models/Attendance');

// Get attendance for a specific room/session (teacher only)
router.get('/session/:roomId', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const attendance = await Attendance.findOne({ roomId: req.params.roomId });
        if (!attendance) {
            return res.status(404).json({ message: 'No attendance records found' });
        }
        res.json(attendance);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching attendance' });
    }
});

// Get all attendance records for a teacher's sessions
router.get('/my-sessions', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const records = await Attendance.find({ teacherId: req.user.id })
            .sort({ sessionDate: -1 })
            .limit(50);
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
});

// Get a student's own attendance history
router.get('/my-history', auth, async (req, res) => {
    try {
        const records = await Attendance.find({
            'records.userId': req.user.id
        }).sort({ sessionDate: -1 });

        const history = records.map(session => {
            const myRecord = session.records.find(
                r => r.userId && r.userId.toString() === req.user.id
            );
            return {
                roomId: session.roomId,
                sessionTitle: session.sessionTitle,
                sessionDate: session.sessionDate,
                joinedAt: myRecord?.joinedAt,
                leftAt: myRecord?.leftAt,
                duration: myRecord?.duration || 0
            };
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching attendance history' });
    }
});

// Export router AND helper functions
module.exports = router;

// Export recordJoin and recordLeave as separate functions
module.exports.recordJoin = async (roomId, userId, username, role) => {
    try {
        let attendance = await Attendance.findOne({ roomId });

        if (!attendance) {
            attendance = new Attendance({
                roomId,
                teacherId: role === 'teacher' ? userId : null,
                records: []
            });
        }

        const existing = attendance.records.find(
            r => r.userId && r.userId.toString() === userId && !r.leftAt
        );

        if (!existing) {
            attendance.records.push({
                userId,
                username,
                role,
                joinedAt: new Date()
            });
            await attendance.save();
        }

        return attendance;
    } catch (err) {
        console.error('Error recording attendance join:', err);
    }
};

module.exports.recordLeave = async (roomId, username) => {
    try {
        const attendance = await Attendance.findOne({ roomId });
        if (!attendance) return;

        const record = attendance.records.find(
            r => r.username === username && !r.leftAt
        );

        if (record) {
            record.leftAt = new Date();
            record.duration = Math.round(
                (record.leftAt.getTime() - record.joinedAt.getTime()) / 1000
            );
            await attendance.save();
        }

        return attendance;
    } catch (err) {
        console.error('Error recording attendance leave:', err);
    }
};
