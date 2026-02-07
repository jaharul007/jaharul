import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
    phoneNumber: {  // ✅ CHANGED: phone → phoneNumber
        type: String, 
        required: true 
    },
    period: { 
        type: String, 
        required: true 
    },
    mode: { 
        type: Number, 
        required: true 
    },
    betOn: { 
        type: String, 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        default: 'pending',
        enum: ['pending', 'won', 'lost']
    },
    winAmount: { 
        type: Number, 
        default: 0 
    },
    result: { 
        type: Number 
    },
    betType: { 
        type: String 
    },
    multiplier: { 
        type: Number, 
        default: 1 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'bets' });

export default mongoose.models.Bet || mongoose.model('Bet', betSchema);
