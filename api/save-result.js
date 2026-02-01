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
    try {
        const client = await clientPromise;
        const db = client.db("wingo_game"); // एडमिन वाला DB नाम "wingo_game" है

        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');

        const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
        const modes = [30, 60, 180, 300]; 
        let updatedCount = 0;

        for (let mode of modes) {
            const periodCount = Math.floor(totalSeconds / mode).toString().padStart(4, '0');
            const finalPeriod = dateStr + periodCount;

            // 1. चेक करो कि क्या ये पीरियड पहले से गेम रिजल्ट में है
            const exists = await db.collection('game_results').findOne({ p: finalPeriod, mode: mode });
            
            if (!exists) {
                // 🔍 एडमिन चेक: क्या एडमिन ने 'history' कलेक्शन में कोई नंबर पहले से डाला है?
                const adminForced = await db.collection('history').findOne({ 
                    period: finalPeriod, 
                    mode: parseInt(mode) 
                });

                let finalNum;
                if (adminForced) {
                    finalNum = adminForced.number; // एडमिन वाला नंबर उठाओ
                    console.log(`⚡ Admin Control Active: Period ${finalPeriod} forced to ${finalNum}`);
                } else {
                    finalNum = Math.floor(Math.random() * 10); // रैंडम नंबर
                }
                
                // 2. फाइनल रिजल्ट सेव करना
                await db.collection('game_results').insertOne({
                    p: finalPeriod,
                    n: finalNum,
                    mode: mode,
                    timestamp: new Date()
                });
                updatedCount++;
            }
        }

        res.status(200).json({ success: true, message: `Updated ${updatedCount} results.` });

    } catch (e) {
        console.error("Error:", e);
        res.status(500).json({ error: "Failed" });
    }
}
