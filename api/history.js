const { MongoClient } = require('mongodb');

// Connection caching (ताकि बार-बार कनेक्शन न बनाना पड़े)
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // URL से मोड लेना (e.g., /api/history?mode=60)
    const { mode } = req.query;

    if (!mode) {
        return res.status(400).json({ error: 'Mode is required' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db('wingo_game'); 
        const historyCollection = db.collection('game_history');

        // लेटेस्ट 10 रिजल्ट्स निकालना (Period 'p' के हिसाब से Descending)
        const history = await historyCollection
            .find({ mode: parseInt(mode) }) 
            .sort({ p: -1 }) 
            .limit(10)       
            .toArray();

        // ब्राउज़र को पुराना डेटा दिखाने से रोकना (Fresh data always)
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.status(200).json(history);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}
