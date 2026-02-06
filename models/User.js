import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    inviteCode: { type: String, default: "" },
    balance: { type: Number, default: 0 }
});

// Vercel ke liye ye line bahut zaroori hai
export default mongoose.models.User || mongoose.model('User', userSchema);
