const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
