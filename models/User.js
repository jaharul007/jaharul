import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String, default: "" },
    balance: { type: Number, default: 0 }
});

// Agar model pehle se bana hai toh wahi use karo, nahi toh naya banao
export default mongoose.models.User || mongoose.model('User', userSchema);
