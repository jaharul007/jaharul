import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
    const { phone, period } = req.query;
    try {
        const client = await clientPromise;
        const db = client.db("test"); // DB 'test'

        // URL से आने वाले '+' को हैंडल करने के लिए
        const cleanPhone = phone ? phone.replace(' ', '+') : "";

        const bet = await db.collection("bets").findOne({ phone: cleanPhone, period: period });

        if (!bet) return res.status(200).json({ status: 'pending' });

        return res.status(200).json({
            status: bet.status,
            winAmount: bet.winAmount || 0,
            resultNumber: bet.result
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
