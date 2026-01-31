import { MongoClient } from 'mongodb';

// Environment variable se URI le raha hai
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        await client.connect();
        
        // Yahan 'gameDB' ki jagah aapke link ka default DB connect hoga
        const database = client.db(); 
        const users = database.collection('users');
        
        const { phone, password } = req.body;

        // User check
        const user = await users.findOne({ phone: phone, password: password });

        if (user) {
            res.status(200).json({ 
                success: true, 
                userId: user._id, 
                balance: user.balance || "0.00" 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: "गलत फोन नंबर या पासवर्ड!" 
            });
        }
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: "सर्वर एरer: " + error.message });
    }
    // Note: Vercel serverless mein client.close() har baar karna zaroori nahi hota, 
    // isse performance slow ho sakti hai.
}
