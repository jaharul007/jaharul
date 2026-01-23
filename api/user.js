import connectDB from '../lib/mongodb'; // अपनी DB कनेक्शन फाइल का पाथ दें
import User from '../models/User'; // अपना User Model इम्पोर्ट करें

export default async function handler(req, res) {
    await connectDB();

    // मान लीजिए आप Session या Token से यूजर ढूंढ रहे हैं
    // अभी के लिए हम एक डेमो यूजर आईडी ले रहे हैं
    const { userId } = req.query; 

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // फ्रंटएंड को डेटा भेजें
        res.status(200).json({
            success: true,
            username: user.username,
            balance: user.balance
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
