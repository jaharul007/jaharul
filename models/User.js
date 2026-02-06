import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    // Field ka naam 'phoneNumber' hi rakhein jo aapke index.html se aa raha hai
    phoneNumber: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    password: { type: String, required: true },
    inviteCode: { type: String, default: "" },
    balance: { type: Number, default: 0 }
});

export default mongoose.models.User || mongoose.model('User', userSchema);
