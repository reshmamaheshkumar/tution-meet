const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    sessionTitle: {
        type: String,
        default: ''
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    records: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        role: {
            type: String,
            enum: ['student', 'teacher']
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: Date,
        duration: {
            type: Number,    // in seconds
            default: 0
        }
    }],
    sessionDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
