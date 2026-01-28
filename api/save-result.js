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
    // अब हम इसे GET और POST दोनों के लिए खोल रहे हैं ताकि Cron Job इसे चला सके
    try {
        const client = await clientPromise;
        const db = client.db("jaharul_game");

        const now = new Date();
        // IST Time (India) के हिसाब से डेट स्ट्रिंग (YYYYMMDD)
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');

        const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();

        // हम 4 मुख्य मोड्स के लिए रिजल्ट एक साथ जनरेट करेंगे
        const modes = [30, 60, 180, 300]; 
        const resultsToInsert = [];

        for (let mode of modes) {
            const periodCount = Math.floor(totalSeconds / mode).toString().padStart(4, '0');
            const finalPeriod = dateStr + periodCount;
            const randomNum = Math.floor(Math.random() * 10);

            // डुप्लिकेट रोकने के लिए चेक करें कि क्या इस Period का रिजल्ट पहले से है
            const exists = await db.collection('game_results').findOne({ p: finalPeriod, mode: mode });
            
            if (!exists) {
                resultsToInsert.push({
                    p: finalPeriod,
                    n: randomNum,
                    mode: mode,
                    timestamp: new Date()
                });
            }
        }

        if (resultsToInsert.length > 0) {
            await db.collection('game_results').insertMany(resultsToInsert);
        }

        res.status(200).json({ 
            success: true, 
            message: `${resultsToInsert.length} modes updated`,
            data: resultsToInsert 
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
