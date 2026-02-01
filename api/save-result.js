import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let clientPromise;

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db("wingo_game"); // ✅ डेटाबेस का नाम एडमिन कोड के साथ सिंक किया

        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');

        const { period, mode: reqMode } = req.body;
        const modes = reqMode ? [parseInt(reqMode)] : [30, 60, 180, 300];
        let updatedCount = 0;

        for (let mode of modes) {
            const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
            const finalPeriod = period || (dateStr + Math.floor(totalSeconds / mode).toString().padStart(4, '0'));

            // 1. चेक करो कि क्या रिजल्ट पहले से मौजूद है
            const exists = await db.collection('results').findOne({ period: finalPeriod, mode: mode });
            
            if (!exists) {
                // 🔍 2. एडमिन चेक: क्या एडमिन ने 'history' में नंबर डाला है?
                const adminForced = await db.collection('history').findOne({ 
                    period: finalPeriod, 
                    mode: mode 
                });

                let finalNum;
                if (adminForced && adminForced.number !== undefined) {
                    finalNum = parseInt(adminForced.number);
                    console.log(`⚡ Admin Force Active: ${finalNum}`);
                } else {
                    finalNum = Math.floor(Math.random() * 10);
                }
                
                // 3. रिजल्ट को 'results' कलेक्शन में सेव करो (जहाँ से फ्रंटएंड डेटा उठाता है)
                await db.collection('results').insertOne({
                    period: finalPeriod,
                    number: finalNum,
                    mode: mode,
                    timestamp: new Date()
                });
                updatedCount++;
            }
        }

        res.status(200).json({ success: true, message: "Result Synced with Admin" });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}
