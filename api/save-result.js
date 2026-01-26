import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    try {
        const client = await clientPromise;
        const db = client.db("jaharul_game");
        
        // Frontend 'p' (period) aur 'mode' bhej raha hai
        const { p, period, mode } = req.body; 
        const finalPeriod = p || period; // Dono mein se jo mile use le lo

        const randomNum = Math.floor(Math.random() * 10);

        await db.collection('game_results').insertOne({
            p: finalPeriod,
            n: randomNum,
            mode: parseInt(mode) || 60, 
            timestamp: new Date()
        });

        res.status(200).json({ success: true, n: randomNum });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
