const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const db = client.db(process.env.MONGODB_DB_NAME || 'bdg_game');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { phoneNumber, password } = req.body;

        // Validation
        if (!phoneNumber || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }

        // Connect to MongoDB
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');

        // Find user by phone number
        const user = await usersCollection.findOne({ phoneNumber });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        // Update last login time
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastLogin: new Date() } }
        );

        // Return success response (without sending password)
        const userResponse = {
            id: user._id,
            phoneNumber: user.phoneNumber,
            balance: user.balance,
            createdAt: user.createdAt,
            status: user.status
        };

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: userResponse
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};