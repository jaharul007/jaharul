import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const db = client.db("jaharul_game");
    const users = db.collection("users");

    // 1. GET BALANCE: Jab koi bhi page load ho
    if (req.method === 'GET') {
      const { phone } = req.query; // URL se phone number lega

      if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number required" });
      }

      const user = await users.findOne({ phone: phone });
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      return res.status(200).json({ success: true, balance: user.balance });
    }

    // 2. UPDATE BALANCE: Registration ya Betting ke liye
    if (req.method === 'POST') {
      const { phone, password, action, amount, balance } = req.body;

      // Agar Naya User Register ho raha hai
      if (phone && password && balance !== undefined) {
        const exists = await users.findOne({ phone: phone });
        if (exists) return res.status(400).json({ success: false, message: "Already Registered" });

        await users.insertOne({ phone, password, balance: parseFloat(balance), createdAt: new Date() });
        return res.status(201).json({ success: true });
      }

      // Agar Betting se balance deduct/add ho raha hai
      if (phone && action && amount) {
        const updateVal = action === 'deduct' ? -Math.abs(amount) : Math.abs(amount);
        const result = await users.findOneAndUpdate(
          { phone: phone },
          { $inc: { balance: updateVal } },
          { returnDocument: 'after' }
        );
        return res.status(200).json({ success: true, balance: result.value.balance });
      }
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
}
