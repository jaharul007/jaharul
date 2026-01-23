const { MongoClient } = require('mongodb');

// MongoDB Connection URI (Vercel Environment Variables mein set karein)
const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    const { mode } = req.query; // HTML se currentMode yahan aayega (30, 60, etc.)

    try {
        await client.connect();
        const database = client.db('wingo_game'); // Aapke DB ka naam
        const historyCollection = database.collection('game_history');

        // MongoDB se latest 10 results nikalna jo current mode ke hain
        const history = await historyCollection
            .find({ mode: parseInt(mode) }) 
            .sort({ p: -1 }) // Latest period upar
            .limit(10)       // Sirf 10 data
            .toArray();

        // Agar database khali hai toh empty array bhejega
        res.status(200).json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database connection failed' });
    } finally {
        await client.close();
    }
}
