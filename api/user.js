import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number is required" });
  }

  try {
    const client = await clientPromise;
    // .db() को खाली छोड़ने से यह डिफ़ॉल्ट डेटाबेस उठा लेगा
    const db = client.db(); 
    const user = await db.collection("users").findOne({ phone: phone });

    if (user) {
      return res.status(200).json({
        success: true,
        data: {
          balance: user.balance || 0,
          phone: user.phone
        }
      });
    } else {
      return res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
