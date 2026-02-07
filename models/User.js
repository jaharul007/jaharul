import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phoneNumber: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    balance: { 
        type: Number, 
        default: 1000 
    },
    inviteCode: { 
        type: String, 
        default: "" 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'users' });

export default mongoose.models.User || mongoose.model('User', userSchema);
