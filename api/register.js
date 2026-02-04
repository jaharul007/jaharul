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
        const { phoneNumber, password, inviteCode } = req.body;

        // Validation
        if (!phoneNumber || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Connect to MongoDB
        const { db } = await connectToDatabase();
        const usersCollection = db.collection('users');

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user object
        const newUser = {
            phoneNumber,
            password: hashedPassword,
            inviteCode: inviteCode || null,
            createdAt: new Date(),
            lastLogin: null,
            balance: 0,
            status: 'active'
        };

        // Insert user into database
        const result = await usersCollection.insertOne(newUser);

        // Return success response (without sending password)
        const userResponse = {
            id: result.insertedId,
            phoneNumber: newUser.phoneNumber,
            createdAt: newUser.createdAt,
            balance: newUser.balance
        };

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};