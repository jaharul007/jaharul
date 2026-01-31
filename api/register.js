const { MongoClient } = require('mongodb');

// आपका अपडेटेड MongoDB कनेक्शन स्ट्रिंग
const uri = "mongodb+srv://alluserdatabase:alluserdatabase@cluster0.bcpe0i1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

export default async function handler(req, res) {
    // सिर्फ POST रिक्वेस्ट को अनुमति दें
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        await client.connect();
        const database = client.db('gameDB'); // आपके डेटाबेस का नाम
        const users = database.collection('users'); // आपके टेबल का नाम

        const { phone, password, inviteCode } = req.body;

        // 1. डेटा चेक करें
        if (!phone || !password) {
            return res.status(400).json({ success: false, message: "Phone and Password are required!" });
        }

        // 2. चेक करें कि यूजर पहले से तो नहीं है
        const userExists = await users.findOne({ phone: phone });
        if (userExists) {
            return res.status(400).json({ success: false, message: "यह नंबर पहले से रजिस्टर है!" });
        }

        // 3. नया यूजर डेटा तैयार करें
        const newUser = {
            phone: phone,
            password: password, 
            inviteCode: inviteCode || "",
            balance: "0.00", // नया यूजर 0 बैलेंस से शुरू होगा
            createdAt: new Date()
        };

        // 4. MongoDB में सेव करें
        const result = await users.insertOne(newUser);

        // 5. सफलता का रिस्पॉन्स भेजें
        return res.status(200).json({
            success: true,
            message: "Registration Successful!",
            userId: result.insertedId,
            balance: "0.00"
        });

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ success: false, message: "Server Error: " + error.message });
    } finally {
        // डेटाबेस कनेक्शन बंद करें
        await client.close();
    }
}
