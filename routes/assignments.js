const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const Assignment = require('../models/Assignment');

// Create assignment (teacher only)
router.post('/', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const { title, description, subjectId, dueDate, maxPoints, attachments } = req.body;

        const assignment = new Assignment({
            title,
            description,
            subjectId,
            teacherId: req.user.id,
            dueDate,
            maxPoints: maxPoints || 100,
            attachments: attachments || []
        });

        await assignment.save();
        res.status(201).json(assignment);
    } catch (err) {
        res.status(500).json({ message: 'Error creating assignment' });
    }
});

// Get all assignments (filtered by role)
router.get('/', auth, async (req, res) => {
    try {
        let assignments;

        if (req.user.role === 'teacher') {
            assignments = await Assignment.find({ teacherId: req.user.id })
                .sort({ createdAt: -1 });
        } else {
            // Students see all published assignments
            assignments = await Assignment.find({ status: 'published' })
                .sort({ dueDate: 1 });
        }

        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching assignments' });
    }
});

// Get single assignment
router.get('/:id', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching assignment' });
    }
});

// Update assignment (teacher only)
router.put('/:id', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const assignment = await Assignment.findOneAndUpdate(
            { _id: req.params.id, teacherId: req.user.id },
            req.body,
            { new: true }
        );

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found or unauthorized' });
        }

        res.json(assignment);
    } catch (err) {
        res.status(500).json({ message: 'Error updating assignment' });
    }
});

// Delete assignment (teacher only)
router.delete('/:id', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const assignment = await Assignment.findOneAndDelete({
            _id: req.params.id,
            teacherId: req.user.id
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found or unauthorized' });
        }

        res.json({ message: 'Assignment deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting assignment' });
    }
});

// Student submits work
router.post('/:id/submit', auth, roleGuard('student'), async (req, res) => {
    try {
        const { content, attachments } = req.body;
        const assignment = await Assignment.findById(req.params.id);

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.status === 'closed') {
            return res.status(400).json({ message: 'Assignment is closed for submissions' });
        }

        // Check if student already submitted
        const existingIdx = assignment.submissions.findIndex(
            s => s.studentId.toString() === req.user.id
        );

        const submission = {
            studentId: req.user.id,
            submittedAt: new Date(),
            content,
            attachments: attachments || []
        };

        if (existingIdx >= 0) {
            // Update existing submission
            assignment.submissions[existingIdx] = {
                ...assignment.submissions[existingIdx].toObject(),
                ...submission
            };
        } else {
            assignment.submissions.push(submission);
        }

        await assignment.save();
        res.json({ message: 'Submission saved', assignment });
    } catch (err) {
        res.status(500).json({ message: 'Error submitting assignment' });
    }
});

// Teacher grades a submission
router.put('/:id/grade/:studentId', auth, roleGuard('teacher'), async (req, res) => {
    try {
        const { points, feedback } = req.body;
        const assignment = await Assignment.findOne({
            _id: req.params.id,
            teacherId: req.user.id
        });

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found or unauthorized' });
        }

        const submission = assignment.submissions.find(
            s => s.studentId.toString() === req.params.studentId
        );

        if (!submission) {
            return res.status(404).json({ message: 'Student submission not found' });
        }

        submission.grade = {
            points,
            feedback,
            gradedAt: new Date()
        };

        await assignment.save();
        res.json({ message: 'Grade saved', assignment });
    } catch (err) {
        res.status(500).json({ message: 'Error grading assignment' });
    }
});

module.exports = router;
