import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true, // हर यूजर का नाम अलग होना चाहिए
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
    },
    balance: {
        type: Number,
        default: 0, // नया अकाउंट बनने पर बैलेंस 0 होगा
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// अगर मॉडल पहले से बना है तो उसे इस्तेमाल करें, वरना नया बनाएं
export default mongoose.models.User || mongoose.model('User', UserSchema);
