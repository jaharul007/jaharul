import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI; // अपनी MongoDB स्ट्रिंग यहाँ डालें
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { phone, password, inviteCode } = req.body;

    try {
        await client.connect();
        const db = client.db('jaharul_game');
        const users = db.collection('users');

        // 1. चेक करें कि यूजर पहले से तो नहीं है
        const existingUser = await users.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists!' });
        }

        // 2. बोनस लॉजिक: अगर कोड 1234 है तो ₹100, वरना ₹0
        let startingBalance = 0;
        if (inviteCode === "1234") {
            startingBalance = 100;
        }

        // 3. नया यूजर डेटाबेस में सेव करें
        const newUser = {
            phone,
            password, // ध्यान दें: असली ऐप में पासवर्ड को हैश (Encrypt) करना चाहिए
            inviteCode,
            balance: startingBalance,
            createdAt: new Date()
        };

        await users.insertOne(newUser);

        return res.status(200).json({ 
            success: true, 
            message: 'Registered successfully!',
            bonus: startingBalance 
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        await client.close();
    }
}
