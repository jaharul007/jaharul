import clientPromise from '../../lib/mongodb.js';

export default async function handler(req, res) {
    const { phone } = req.query;

    if (!phone) {
        return res.status(400).json({ success: false, message: "Phone missing" });
    }

    try {
        const client = await clientPromise;
        const db = client.db('wingo_game'); // Tumhara DB name
        
        // MongoDB se user ka latest balance nikalna
        const user = await db.collection('users').findOne({ phone: phone });

        if (user) {
            return res.status(200).json({ 
                success: true, 
                balance: user.balance 
            });
        } else {
            return res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
