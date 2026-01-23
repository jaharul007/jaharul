const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const { period, mode } = req.body;
    try {
        await client.connect();
        const db = client.db('wingo_game');
        
        // Random number generate karna (0-9)
        const num = Math.floor(Math.random() * 10);
        const color = (num === 0 || num === 5) ? (num === 0 ? '#ff4d4d' : '#2ead6d') : (num % 2 === 0 ? '#ff4d4d' : '#2ead6d');
        const size = num >= 5 ? 'Big' : 'Small';

        const result = { p: period, n: num, c: color, s: size, mode: parseInt(mode), v: (num === 0 || num === 5) };
        
        await db.collection('game_history').insertOne(result);
        res.status(200).json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        await client.close();
    }
}
