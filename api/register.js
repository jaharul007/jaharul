import clientPromise from "../lib/mongodb";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === "OPTIONS") return res.status(200).end();
  
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const { phoneNumber, password, inviteCode, balance } = req.body;

    // Validation
    if (!phoneNumber || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number and password are required" 
      });
    }

    const client = await clientPromise;
    const db = client.db("jaharul_game"); // अपना database name यहाँ डालें
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ phone: phoneNumber });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User already registered with this phone number" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate initial balance
    let initialBalance = 0;
    if (balance && !isNaN(balance)) {
      initialBalance = Number(balance);
    } else if (inviteCode === "1234") {
      initialBalance = 100;
    }

    // Create new user
    const newUser = {
      phone: phoneNumber,
      password: hashedPassword,
      balance: initialBalance,
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    if (result.acknowledged) {
      return res.status(200).json({ 
        success: true, 
        message: "Registration successful",
        phone: phoneNumber,
        balance: initialBalance
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to create user" 
      });
    }

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
}
