import clientPromise from "../lib/mongodb"; // पाथ चेक करें (../lib/ होगा)

export default async function handler(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone missing" });
    }

    const client = await clientPromise;
    const db = client.db(); // ब्रैकेट खाली रखें
    const user = await db.collection("users").findOne({ phone: phone });

    if (!user) {
      return res.status(200).json({ success: true, data: { balance: 0 } });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    // यह लाइन पक्का करती है कि एरर आने पर भी JSON ही मिले, HTML नहीं
    return res.status(500).json({ success: false, error: error.message });
  }
}
