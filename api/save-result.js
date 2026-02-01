import clientPromise from '../lib/mongodb.js'; // Connection file reuse kar rahe hain

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        const client = await clientPromise;
        const db = client.db("wingo_game");

        const now = new Date();
        const dateStr = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');

        const { period, mode: reqMode } = req.body;
        // Agar request mein mode nahi hai toh default modes use honge
        const modes = reqMode ? [parseInt(reqMode)] : [30, 60, 180, 300];

        for (let mode of modes) {
            const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
            const finalPeriod = period || (dateStr + Math.floor(totalSeconds / mode).toString().padStart(4, '0'));

            // 1. Check if result already exists
            const exists = await db.collection('results').findOne({ period: finalPeriod, mode: mode });
            
            if (!exists) {
                // 🔍 2. Admin Force Check
                // Dhyaan dein: add-result.js forced number isi 'history' collection mein save karna chahiye
                const adminForced = await db.collection('history').findOne({ 
                    period: finalPeriod, 
                    mode: mode 
                });

                let finalNum;
                if (adminForced && adminForced.number !== undefined) {
                    finalNum = parseInt(adminForced.number);
                    console.log(`⚡ Admin Force Active for ${finalPeriod}: ${finalNum}`);
                } else {
                    finalNum = Math.floor(Math.random() * 10); // Random number generation
                }
                
                // 3. Save result to 'results'
                await db.collection('results').insertOne({
                    period: finalPeriod,
                    number: finalNum,
                    mode: mode,
                    timestamp: new Date()
                });

                // 4. (Optional) Purane forced records delete karna taaki DB bhare nahi
                if (adminForced) {
                    await db.collection('history').deleteOne({ _id: adminForced._id });
                }
            }
        }

        res.status(200).json({ success: true, message: "Result Processed Successfully" });

    } catch (e) {
        console.error("❌ Save Result Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
}
