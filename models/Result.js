import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
    period: { 
        type: String, 
        required: true 
    },
    mode: { 
        type: Number, 
        required: true 
    },
    number: { 
        type: Number, 
        required: true,
        min: 0,
        max: 9
    },
    color: { 
        type: [String], 
        required: true 
    },
    size: { 
        type: String, 
        required: true,
        enum: ['Big', 'Small']
    },
    isForced: { 
        type: Boolean, 
        default: false 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'results' });

// Compound index for faster queries
resultSchema.index({ period: 1, mode: 1 }, { unique: true });

export default mongoose.models.Result || mongoose.model('Result', resultSchema);
