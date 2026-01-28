import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    // इसे GET या POST किसी से भी चला सकते हैं
    try {
        const client = await clientPromise;
        const db = client.db("jaharul_game"); // आपका पुराना DB नाम

        const now = new Date();
        // IST (India Time) के हिसाब से डेट
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');

        const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

        // चारों मोड (30s, 1m, 3m, 5m) की हिस्ट्री एक साथ मैनेज होगी
        const modes = [30, 60, 180, 300]; 
        let updatedCount = 0;

        for (let mode of modes) {
            const periodCount = Math.floor(totalSeconds / mode).toString().padStart(4, '0');
            const finalPeriod = dateStr + periodCount;

            // 1. पहले चेक करो कि क्या ये पीरियड पहले से सेव है? (ताकि डुप्लिकेट न हो)
            const exists = await db.collection('game_results').findOne({ p: finalPeriod, mode: mode });
            
            if (!exists) {
                const randomNum = Math.floor(Math.random() * 10);
                
                // 2. मोंगो डीबी में रिजल्ट सेव करना
                await db.collection('game_results').insertOne({
                    p: finalPeriod,
                    n: randomNum,
                    mode: mode,
                    timestamp: new Date()
                });
                updatedCount++;
            }
        }

        res.status(200).json({ 
            success: true, 
            message: `DB Updated: ${updatedCount} new results saved.` 
        });

    } catch (e) {
        console.error("MongoDB Error:", e);
        res.status(500).json({ error: "Database connection failed" });
    }
}
