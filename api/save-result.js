import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI; // Vercel Environment Variables mein apna MongoDB URL dalein
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        await client.connect();
        const db = client.db('jaharul_game');
        const { period, number, mode } = req.body;

        const newResult = {
            p: period,
            n: parseInt(number),
            m: mode,
            t: new Date()
        };

        await db.collection('game_history').insertOne(newResult);
        
        // Purane records delete karein (optional: sirf 100 rakhein)
        // await db.collection('game_history').deleteMany({ m: mode, t: { $lt: new Date(Date.now() - 24*60*60*1000) } });

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
