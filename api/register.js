import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

    try {
        const { phone, password, inviteCode } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ success: false, message: 'Phone/Pass missing' });
        }

        // Connection Check
        const client = await clientPromise;
        if (!client) throw new Error("MongoDB Client not found");

        const db = client.db('wingo_game'); 
        const usersCollection = db.collection('users');

        const existingUser = await usersCollection.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Number already registered!' });
        }

        let startingBalance = (inviteCode === "1234") ? 100 : 0;

        const newUser = {
            phone,
            password,
            balance: startingBalance,
            totalBets: 0,
            createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        if (result.acknowledged) {
            return res.status(200).json({ 
                success: true, 
                message: 'Registered!',
                phone: phone 
            });
        }
    } catch (error) {
        console.error('SERVER ERROR:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Server Error: " + error.message 
        });
    }
}
