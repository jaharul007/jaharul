const { MongoClient } = require('mongodb');

let cachedClient = null;

async function connectToDB() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const { period, mode } = req.body;

    if (!period || !mode) {
        return res.status(400).json({ error: 'Missing period or mode' });
    }

    try {
        const client = await connectToDB();
        const db = client.db('wingo_game');
        
        // Random number (0-9)
        const num = Math.floor(Math.random() * 10);
        
        // Data structure jo aapke frontend (wingo_game.html) ke saath match kare
        const result = { 
            p: period,          // Period ID
            n: num,             // Number
            mode: parseInt(mode), 
            createdAt: new Date() 
        };
        
        await db.collection('game_history').insertOne(result);
        
        res.status(200).json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
    // client.close() yahan bhi nahi karna hai
}
