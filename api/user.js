import clientPromise from "../lib/mongodb";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const { phone } = req.query;
    
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number missing" });
    }

    const client = await clientPromise;
    const db = client.db("jaharul_game"); // अपना database name यहाँ डालें
    
    const user = await db.collection("users").findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Password को response में न भेजें
    const { password, ...userData } = user;

    return res.status(200).json({ 
      success: true, 
      data: {
        phone: userData.phone,
        balance: userData.balance || 0
      }
    });

  } catch (error) {
    console.error("User API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Server error",
      message: error.message 
    });
  }
}
