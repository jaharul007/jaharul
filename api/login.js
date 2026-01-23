const { MongoClient } = require('mongodb');

// आपका फाइनल कनेक्शन स्ट्रिंग यहाँ जोड़ दिया गया है
const uri = "mongodb+srv://alluserdatabase:alluserdatabase@cluster0.bcpe0i1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; 
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // सिर्फ POST रिक्वेस्ट को अनुमति दें
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        await client.connect();
        // 'gameDB' डेटाबेस और 'users' कलेक्शन का इस्तेमाल करें
        const database = client.db('gameDB');
        const users = database.collection('users');
        
        const { phone, password } = req.body;

        // डेटाबेस में यूजर को ढूंढें
        const user = await users.findOne({ phone: phone, password: password });

        if (user) {
            // लॉगिन सफल होने पर यूजर का डेटा भेजें
            res.status(200).json({ 
                success: true, 
                userId: user._id, 
                balance: user.balance || "0.00" 
            });
        } else {
            // गलत जानकारी होने पर एरर भेजें
            res.status(401).json({ 
                success: false, 
                message: "गलत फोन नंबर या पासवर्ड!" 
            });
        }
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ success: false, message: "सर्वर एरर: " + error.message });
    } finally {
        // कनेक्शन बंद करें
        await client.close();
    }
}
