// api/register.js - Vercel Serverless Function
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

// MongoDB Connection URL - Apna MongoDB Atlas URL yahan dalen
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/bdg_game?retryWrites=true&w=majority';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db('bdg_game');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phone, password, inviteCode } = req.body;

    // Validate invite code
    if (inviteCode !== '1234') {
      return res.status(400).json({ message: 'Invalid invite code' });
    }

    // Validate phone and password
    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if phone already exists
    const existingUser = await usersCollection.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      phone,
      password: hashedPassword,
      balance: 100,
      inviteCode,
      registeredAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        phone: newUser.phone,
        balance: newUser.balance
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
}
