import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

let cachedClient = null;

async function connectDB() {
    if (cachedClient) return cachedClient;

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { phoneNumber, password, inviteCode } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const client = await connectDB();
        const db = client.db("bdg_game");
        const users = db.collection("users");

        const existingUser = await users.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await users.insertOne({
            phoneNumber,
            password: hashedPassword,
            inviteCode: inviteCode || null,
            createdAt: new Date()
        });

        // रजिस्ट्रेशन सफल होने पर रीडिरेक्शन की जानकारी भेजें
        return res.status(200).json({ message: "Registration successful", redirect: "/wingo_game.html" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Server error" });
    }
}