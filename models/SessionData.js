const mongoose = require('mongoose');

const sessionDataSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: String,
    highlights: [{
        time: String,
        note: String,
        type: {
            type: String,
            enum: ['star', 'check', 'task'],
            default: 'star'
        }
    }],
    chatHistory: [{
        user: String,
        text: String,
        time: String,
        isAI: Boolean
    }],
    actionItems: [{
        text: String,
        completed: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('SessionData', sessionDataSchema);
