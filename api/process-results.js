/**
 * PROCESS-RESULT.JS (Node.js/Vercel Backend)
 * यह फाइल हर गेम पीरियड के अंत में चलती है।
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { period, mode } = req.body;

        // 1. डेटाबेस से चेक करें कि क्या एडमिन ने कोई नंबर फिक्स किया है
        // (मान लीजिए 'FixedResults' आपकी DB टेबल है)
        let winningNumber = await getAdminFixedNumber(period, mode);

        // 2. अगर एडमिन ने कोई नंबर नहीं डाला, तो ऑटोमैटिक रैंडम नंबर चुनें
        if (winningNumber === null || winningNumber === undefined) {
            winningNumber = Math.floor(Math.random() * 10);
        }

        // 3. रिजल्ट के आधार पर कलर और साइज तय करें
        const color = getResultColor(winningNumber);
        const size = winningNumber >= 5 ? 'Big' : 'Small';

        // 4. सभी पेंडिंग बेट्स (Pending Bets) को चेक करें और विनर्स को पैसा दें
        const allBets = await getAllPendingBets(period, mode);
        
        for (let bet of allBets) {
            let isWin = false;
            let multiplier = 0;

            // विनिंग लॉजिक चेक करें
            if (bet.betOn == winningNumber) {
                isWin = true;
                multiplier = 9; // नंबर पर 9 गुना
            } else if (bet.betOn == color || (color.includes(bet.betOn))) {
                isWin = true;
                multiplier = (winningNumber === 0 || winningNumber === 5) ? 1.5 : 2; 
            } else if (bet.betOn == size) {
                isWin = true;
                multiplier = 2; // Big/Small पर 2 गुना
            }

            if (isWin) {
                const winAmount = bet.amount * multiplier;
                await updateWalletBalance(bet.phone, winAmount); // पैसा यूजर के वॉलेट में भेजें
                await updateBetStatus(bet.id, 'won', winAmount);
            } else {
                await updateBetStatus(bet.id, 'lost', 0);
            }
        }

        // 5. गेम हिस्ट्री में रिजल्ट सेव करें
        await saveToHistory(period, mode, winningNumber, color, size);

        return res.status(200).json({ 
            success: true, 
            number: winningNumber, 
            color, 
            size 
        });

    } catch (error) {
        console.error("Process Result Error:", error);
        return res.status(500).json({ success: false, message: "Internal Error" });
    }
}

// हेल्पर फंक्शन: नंबर के हिसाब से कलर तय करना
function getResultColor(num) {
    if (num === 0) return 'Red-Violet';
    if (num === 5) return 'Green-Violet';
    return (num % 2 === 0) ? 'Red' : 'Green';
}

/** * नोट: ऊपर दिए गए functions (getAdminFixedNumber, updateWalletBalance, आदि) 
 * आपको अपने डेटाबेस (Firebase, MongoDB, या SQL) के हिसाब से कनेक्ट करने होंगे।
 */
