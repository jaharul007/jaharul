import { MongoClient } from 'mongodb';

// Connection caching (Performance ke liye)
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    // process.env.MONGODB_URI ka matlab hai ki password Vercel settings se aayega
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('jaharul_game');
    cachedDb = db;
    return db;
}

export default async function handler(req, res) {
    // Sirf POST request allow karein
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const db = await connectToDatabase();
        const { period, number, mode } = req.body;

        // Naya result object
        const newResult = {
            p: period,          // Period ID
            n: parseInt(number), // Number (0-9)
            m: parseInt(mode),   // Game Mode (30, 60, 180, etc.)
            t: new Date()        // Timestamp
        };

        // Database mein save karein
        await db.collection('game_history').insertOne(newResult);

        // Success response
        return res.status(200).json({ success: true, data: newResult });

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: "Failed to save result" });
    }
}
