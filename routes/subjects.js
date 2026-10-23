const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const Subject = require('../models/Subject');

// Create subject (teacher only)
router.post('/', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const { name, description, coverImage, syllabus, schedule } = req.body;

        const subject = new Subject({
            name,
            description,
            teacherId: req.user.id,
            coverImage,
            syllabus: syllabus || [],
            schedule: schedule || {}
        });

        await subject.save();
        res.status(201).json(subject);
    } catch (err) {
        res.status(500).json({ message: 'Error creating subject' });
    }
});

// Get all subjects (filtered by role)
router.get('/', auth, async (req, res) => {
    try {
        let subjects;

        if (req.user.role === 'teacher') {
            subjects = await Subject.find({ teacherId: req.user.id })
                .sort({ createdAt: -1 });
        } else {
            // Students see subjects they're enrolled in + all active subjects
            subjects = await Subject.find({ status: 'active' })
                .populate('teacherId', 'name email')
                .sort({ name: 1 });
        }

        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subjects' });
    }
});

// Get single subject
router.get('/:id', auth, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id)
            .populate('teacherId', 'name email')
            .populate('enrolledStudents', 'name email');

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.json(subject);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subject' });
    }
});

// Update subject (teacher only)
router.put('/:id', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const subject = await Subject.findOneAndUpdate(
            { _id: req.params.id, teacherId: req.user.id },
            req.body,
            { new: true }
        );

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found or unauthorized' });
        }

        res.json(subject);
    } catch (err) {
        res.status(500).json({ message: 'Error updating subject' });
    }
});

// Delete subject (teacher only)
router.delete('/:id', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const subject = await Subject.findOneAndDelete({
            _id: req.params.id,
            teacherId: req.user.id
        });

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found or unauthorized' });
        }

        res.json({ message: 'Subject deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting subject' });
    }
});

// Student enrolls in a subject
router.post('/:id/enroll', auth, roleGuard('student'), async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        if (subject.enrolledStudents.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already enrolled' });
        }

        subject.enrolledStudents.push(req.user.id);
        await subject.save();
        res.json({ message: 'Enrolled successfully', subject });
    } catch (err) {
        res.status(500).json({ message: 'Error enrolling in subject' });
    }
});

// Student unenrolls from a subject
router.post('/:id/unenroll', auth, roleGuard('student'), async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        subject.enrolledStudents = subject.enrolledStudents.filter(
            id => id.toString() !== req.user.id
        );

        await subject.save();
        res.json({ message: 'Unenrolled successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error unenrolling from subject' });
    }
});

module.exports = router;
