// api/save-result.js
import { connectToDatabase } from '../lib/mongodb';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    const { db } = await connectToDatabase();
    const { period, mode } = req.body; // Mode frontend se mil raha hai

    const randomNum = Math.floor(Math.random() * 10);

    await db.collection('game_history').insertOne({
        p: period,
        n: randomNum,
        mode: parseInt(mode), // 30, 60, 180, ya 300 save hoga
        createdAt: new Date()
    });

    res.status(200).json({ success: true, n: randomNum });
}
