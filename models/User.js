import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        // +91 format validation ensure karta hai
        validate: {
            validator: function(v) {
                return /^\+91\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number! Use format: +91XXXXXXXXXX`
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 4
    },
    inviteCode: {
        type: String,
        default: "",
        trim: true
    },
    balance: {
        type: Number,
        default: 1000,
        min: 0,
        // Decimal handling for currency accuracy
        get: v => parseFloat(v.toFixed(2)),
        set: v => parseFloat(v.toFixed(2))
    },
    // Game statistics tracking
    totalBets: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    lastLogin: { type: Date, default: Date.now }
}, {
    collection: 'users', // Aapka specific collection name
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Faster searching by phone
userSchema.index({ phoneNumber: 1 });

// Balance update hone par lastLogin update hoga
userSchema.pre('save', function(next) {
    if (this.isModified('balance')) {
        this.lastLogin = new Date();
    }
    next();
});

// --- Helper Methods for Aviator Game ---

// Balance add karne ke liye (Cashout ke waqt)
userSchema.methods.addBalance = function(amount) {
    this.balance += parseFloat(amount);
    return this.save();
};

// Balance deduct karne ke liye (Bet lagate waqt)
userSchema.methods.deductBalance = function(amount) {
    if (this.balance < amount) {
        throw new Error('Insufficient balance');
    }
    this.balance -= parseFloat(amount);
    return this.save();
};

// Singleton pattern to prevent re-compilation errors
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
