// ... (Initial Imports and connectDB same as your code)

export default async function handler(req, res) {
    // ... (CORS Headers same as your code)
    await connectDB();

    if (req.method === 'POST') {
        try {
            const { phone, period, mode, betOn, amount, betType } = req.body;
            const betAmount = parseFloat(amount);

            if (!phone || isNaN(betAmount)) {
                return res.status(400).json({ success: false, message: 'Invalid Data' });
            }

            // Balance Check and Deduction (Atomic)
            const user = await User.findOneAndUpdate(
                { phoneNumber: phone, balance: { $gte: betAmount } },
                { $inc: { balance: -betAmount } },
                { new: true }
            );

            if (!user) {
                return res.status(400).json({ success: false, message: 'Insufficient Balance!' });
            }

            // Create Bet record
            await Bet.create({
                phone, 
                period, 
                mode: parseInt(mode),
                betOn: String(betOn), 
                amount: betAmount,
                status: 'pending', 
                betType: betType || 'number',
                timestamp: new Date()
            });

            return res.status(200).json({ success: true, newBalance: user.balance });

        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    // ... (GET logic same as your code)
}