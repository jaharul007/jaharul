import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
    const { phone, period } = req.query;
    try {
        const client = await clientPromise;
        const db = client.db("test");

        // सिर्फ स्टेटस चेक करो, बैलेंस 'save-result' बढ़ा चुका है
        const bet = await db.collection("bets").findOne({ phone: phone, period: period });

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
