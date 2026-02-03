import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    // 1. CORS Headers (ताकि ब्राउज़र ब्लॉक न करे)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS request को हैंडल करें
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // सिर्फ POST मेथड की अनुमति दें
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { phone, password, inviteCode } = req.body;

        // इनपुट चेक करें
        if (!phone || !password) {
            return res.status(400).json({ success: false, message: 'Phone and Password are required' });
        }

        // 2. MongoDB कनेक्शन
        const client = await clientPromise;
        const db = client.db('wingo_game');
        const usersCollection = db.collection('users');

        // 3. चेक करें कि यूजर पहले से तो नहीं है
        const existingUser = await usersCollection.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists!' });
        }

        // 4. इनविटेशन कोड (1234) लॉजिक
        let startingBalance = 0;
        if (inviteCode === "1234") {
            startingBalance = 100;
        }

        // 5. नया यूजर डेटाबेस में सेव करें
        const newUser = {
            phone,
            password, // ध्यान दें: प्रोडक्शन में bcrypt का उपयोग करके पासवर्ड हैश करें
            balance: startingBalance,
            totalBets: 0,
            totalWins: 0,
            totalLosses: 0,
            inviteUsed: inviteCode || "none",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        if (result.acknowledged) {
            return res.status(200).json({ 
                success: true, 
                message: 'Registration Successful!',
                bonus: startingBalance 
            });
        } else {
            throw new Error("Failed to insert user");
        }

    } catch (error) {
        console.error('❌ Register API Error:', error);
        // अगर 401 आ रहा है तो शायद MongoDB URI गलत है
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error. Check Database Connection.' 
        });
    }
}
