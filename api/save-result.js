import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: "Method not allowed" });

    try {
        const client = await clientPromise;
        const db = client.db("wingo_game");

        const { period, mode: reqMode } = req.body;

        // अगर फ्रंटएंड से पीरियड नहीं आया है, तो एरर दें (ताकि Sync न बिगड़े)
        if (!period) {
            return res.status(400).json({ success: false, message: "Period is required from frontend" });
        }

        const mode = parseInt(reqMode) || 60;

        // 1. चेक करें कि क्या इस पीरियड का रिजल्ट पहले से मौजूद है
        const exists = await db.collection('results').findOne({ period: period, mode: mode });
        
        if (exists) {
            return res.status(200).json({ success: true, message: "Result already exists", data: exists });
        }

        // 2. एडमिन फोर्स (Admin Force) चेक करें
        // हम 'history' कलेक्शन में देखते हैं जहाँ एडमिन ने नंबर सेव किया होगा
        let adminForced = await db.collection('history').findOne({ 
            mode: mode,
            // आप चाहें तो यहाँ period: period भी जोड़ सकते हैं अगर एडमिन स्पेसिफिक पीरियड के लिए सेट कर रहा है
        });

        let finalNum;
        if (adminForced && adminForced.number !== undefined) {
            finalNum = parseInt(adminForced.number);
            console.log(`✅ Admin Force applied: ${finalNum} for period ${period}`);
        } else {
            // अगर एडमिन ने कुछ सेट नहीं किया, तो रैंडम नंबर
            finalNum = Math.floor(Math.random() * 10);
            console.log(`🎲 Random result: ${finalNum} for period ${period}`);
        }
        
        // 3. रिजल्ट को 'results' कलेक्शन में सेव करें
        const newResult = {
            period: period,
            number: finalNum,
            mode: mode,
            timestamp: new Date()
        };
        await db.collection('results').insertOne(newResult);

        // 4. बेट्स का निपटारा (Settlement) शुरू करें
        await settleBetsForPeriod(db, period, mode, finalNum);

        // 5. इस्तेमाल किए गए एडमिन रिकॉर्ड को डिलीट करें ताकि अगला रिजल्ट रैंडम आए
        if (adminForced) {
            await db.collection('history').deleteOne({ _id: adminForced._id });
        }

        return res.status(200).json({ 
            success: true, 
            message: "Result generated and settled", 
            number: finalNum 
        });

    } catch (e) {
        console.error("❌ API Error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
}

// बेट सेटलमेंट फंक्शन
// बेट सेटलमेंट फंक्शन
async function settleBetsForPeriod(db, period, mode, winNum) {
    const pendingBets = await db.collection('bets').find({
        period: period,
        mode: mode,
        status: 'pending'
    }).toArray();

    if (pendingBets.length === 0) return;

    const winSize = winNum >= 5 ? 'Big' : 'Small';
    let winColors = [];
    
    if (winNum === 0) winColors = ['Red', 'Violet'];
    else if (winNum === 5) winColors = ['Green', 'Violet'];
    else if (winNum % 2 === 0) winColors = ['Red'];
    else winColors = ['Green'];

    for (let bet of pendingBets) {
        let isWin = false;
        let mult = 0;

        // Number Win (9x)
        if (parseInt(bet.betOn) === winNum) { 
            isWin = true; 
            mult = 9; 
        }
        // Big/Small Win (2x)
        else if (bet.betOn === winSize) { 
            isWin = true; 
            mult = 2; 
        }
        // Color Win
        else if (winColors.includes(bet.betOn)) {
            isWin = true;
            if (bet.betOn === 'Violet') {
                mult = 4.5;
            } else {
                mult = (winNum === 0 || winNum === 5) ? 1.5 : 2;
            }
        }

        if (isWin) {
            // जीतने वालों के लिए
            const winAmount = Math.round((parseFloat(bet.amount) * mult) * 100) / 100;

            await db.collection('users').updateOne(
                { phone: bet.phone }, 
                { $inc: { balance: winAmount, totalWins: 1 } }
            );

            await db.collection('bets').updateOne(
                { _id: bet._id }, 
                { $set: { 
                    status: 'won', 
                    winAmount: winAmount, 
                    result: winNum, 
                    processedAt: new Date() 
                } }
            );
        } else {
            // हारने वालों के लिए
            await db.collection('bets').updateOne(
                { _id: bet._id }, 
                { $set: { 
                    status: 'lost', 
                    winAmount: 0, 
                    result: winNum, 
                    processedAt: new Date() 
                } }
            );
            
            await db.collection('users').updateOne(
                { phone: bet.phone }, 
                { $inc: { totalLosses: 1 } }
            );
        }
    } // loop ends
} // function ends