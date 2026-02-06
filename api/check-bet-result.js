import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
    const { phone, period } = req.query;
    try {
        const client = await clientPromise;
        const db = client.db("test");

        const bet = await db.collection("bets").findOne({ phone: phone, period: period });

        if (!bet) {
            // अगर बेट नहीं है, तो चेक करें कि क्या रिजल्ट आ चुका है
            const resData = await db.collection("results").findOne({ period: period });
            return res.status(200).json({ status: resData ? 'no_bet' : 'pending' });
        }

        return res.status(200).json({
            status: bet.status,
            winAmount: bet.winAmount || 0,
            resultNumber: bet.result
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
