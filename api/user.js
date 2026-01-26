import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  try {
    await client.connect();
    const db = client.db("jaharul_game");
    const users = db.collection("users");

    // Maan lete hain ki abhi hum ek default user use kar rahe hain 
    // Jab login system full hoga tab yahan session se ID aayegi
    const userId = "65b2f1e2a3c4d5e6f7a8b9c0"; // Example ID

    // 1. BALANCE DEKHNA (GET Request)
    if (req.method === 'GET') {
      const user = await users.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        // Agar user nahi mila toh ek naya user bana do testing ke liye
        await users.insertOne({ _id: new ObjectId(userId), balance: 1000.00, mobile: "1234567890" });
        return res.status(200).json({ balance: 1000.00 });
      }
      return res.status(200).json({ balance: user.balance });
    }

    // 2. BALANCE UPDATE KARNA (POST Request - For Betting)
    if (req.method === 'POST') {
      const { amount, action } = req.body; // action: 'deduct' or 'add'
      
      const updateAmount = action === 'deduct' ? -Math.abs(amount) : Math.abs(amount);
      
      const result = await users.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $inc: { balance: updateAmount } },
        { returnDocument: 'after' }
      );

      return res.status(200).json({ balance: result.value.balance });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "User API Error" });
  }
}
