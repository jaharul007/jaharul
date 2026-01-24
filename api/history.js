import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    const { mode } = req.query;

    try {
        await client.connect();
        const db = client.db('jaharul_game');
        
        // Latest 10 records fetch karein
        const history = await db.collection('game_history')
            .find({ m: parseInt(mode) })
            .sort({ t: -1 })
            .limit(10)
            .toArray();

        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
