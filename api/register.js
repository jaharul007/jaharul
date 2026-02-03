const { MongoClient } = require('mongodb');

// MongoDB Client ko function ke bahar rakha jata hai taaki connection reuse ho sake
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // Sirf POST request allow karein
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { phone, password, inviteCode } = req.body;

        // Basic validation
        if (!phone || !password) {
            return res.status(400).json({ message: 'Phone and Password are required' });
        }

        const client = await connectToDatabase();
        const db = client.db('bdg_game'); // Aapke Database ka naam
        const users = db.collection('users');

        // Check karein ki user pehle se to nahi hai
        const userExists = await users.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ message: 'Phone number already registered' });
        }

        // Naya user create karein
        const newUser = {
            phone,
            password, // Production mein ise bcrypt se hash karna chahiye
            inviteCode: inviteCode || "none",
            balance: 0,
            createdAt: new Date()
        };

        await users.insertOne(newUser);

        return res.status(200).json({ 
            success: true, 
            message: 'Registration successful' 
        });

    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
}
