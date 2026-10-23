const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    maxPoints: {
        type: Number,
        default: 100
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String
    }],
    submissions: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        content: String,
        attachments: [{
            fileName: String,
            fileUrl: String
        }],
        grade: {
            points: Number,
            feedback: String,
            gradedAt: Date
        }
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'published'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema);
