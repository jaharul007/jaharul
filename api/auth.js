import mongoose from 'mongoose';
import User from '../models/User.js'; 

const connectDB = async () => {
    if (mongoose.connections && mongoose.connections[0].readyState) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    await connectDB();

    // --- GET Request: Balance check ---
    if (req.method === 'GET') {
        const { action, phoneNumber } = req.query;

        if (action === 'getBalance') {
            try {
                if (!phoneNumber) {
                    return res.status(400).json({ success: false, message: 'Phone number missing' });
                }
                
                // URL encoding fix
                const cleanPhone = decodeURIComponent(phoneNumber);
                const user = await User.findOne({ phoneNumber: cleanPhone });

                if (!user) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                }
                
                return res.status(200).json({ 
                    success: true, 
                    balance: user.balance,
                    phoneNumber: user.phoneNumber
                });
            } catch (err) {
                console.error("Get Balance Error:", err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
        }
    }

    // --- POST Request: Register, Login, and Balance Update ---
    if (req.method === 'POST') {
        const { action, phoneNumber, password, inviteCode, balance, betAmount, winAmount, gameType } = req.body;

        // REGISTER LOGIC
        if (action === 'register') {
            try {
                if (!phoneNumber || !password) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number and password required' 
                    });
                }

                const userExists = await User.findOne({ phoneNumber });
                if (userExists) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number already registered' 
                    });
                }

                const newUser = new User({
                    phoneNumber,
                    password, 
                    inviteCode: inviteCode || "",
                    balance: balance || 1000
                });

                await newUser.save();
                
                return res.status(201).json({ 
                    success: true, 
                    message: 'Registration Successful', 
                    balance: newUser.balance,
                    phoneNumber: newUser.phoneNumber
                });
            } catch (err) {
                console.error("Registration Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Registration Failed' 
                });
            }
        }

        // LOGIN LOGIC
        else if (action === 'login') {
            try {
                if (!phoneNumber || !password) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number and password required' 
                    });
                }

                const user = await User.findOne({ phoneNumber, password });
                if (!user) {
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Invalid Phone or Password' 
                    });
                }
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Login Success', 
                    balance: user.balance,
                    phoneNumber: user.phoneNumber
                });
            } catch (err) {
                console.error("Login Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Login Failed' 
                });
            }
        }

        // UPDATE BALANCE (For Aviator Game)
        else if (action === 'updateBalance') {
            try {
                if (!phoneNumber || balance === undefined || balance === null) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number and balance required' 
                    });
                }

                const cleanPhone = decodeURIComponent(phoneNumber);

                // Validate balance is a number
                const newBalance = parseFloat(balance);
                if (isNaN(newBalance) || newBalance < 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid balance value' 
                    });
                }

                const user = await User.findOneAndUpdate(
                    { phoneNumber: cleanPhone },
                    { $set: { balance: newBalance } },
                    { new: true }
                );

                if (!user) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found' 
                    });
                }

                return res.status(200).json({ 
                    success: true, 
                    balance: user.balance,
                    phoneNumber: user.phoneNumber
                });
            } catch (err) {
                console.error("Update Balance Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Balance update failed' 
                });
            }
        }

        // PLACE BET (For game transactions with logging)
        else if (action === 'placeBet') {
            try {
                if (!phoneNumber || !betAmount) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number and bet amount required' 
                    });
                }

                const cleanPhone = decodeURIComponent(phoneNumber);
                const betValue = parseFloat(betAmount);

                if (isNaN(betValue) || betValue <= 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid bet amount' 
                    });
                }

                const user = await User.findOne({ phoneNumber: cleanPhone });

                if (!user) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found' 
                    });
                }

                if (user.balance < betValue) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Insufficient balance' 
                    });
                }

                // Deduct bet amount
                const newBalance = user.balance - betValue;
                user.balance = newBalance;
                await user.save();

                return res.status(200).json({ 
                    success: true, 
                    balance: user.balance,
                    message: 'Bet placed successfully',
                    phoneNumber: user.phoneNumber
                });
            } catch (err) {
                console.error("Place Bet Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Bet placement failed' 
                });
            }
        }

        // CASHOUT (Win money and add to balance)
        else if (action === 'cashout') {
            try {
                if (!phoneNumber || !winAmount) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Phone number and win amount required' 
                    });
                }

                const cleanPhone = decodeURIComponent(phoneNumber);
                const winValue = parseFloat(winAmount);

                if (isNaN(winValue) || winValue <= 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid win amount' 
                    });
                }

                const user = await User.findOne({ phoneNumber: cleanPhone });

                if (!user) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'User not found' 
                    });
                }

                // Add win amount
                const newBalance = user.balance + winValue;
                user.balance = newBalance;
                await user.save();

                return res.status(200).json({ 
                    success: true, 
                    balance: user.balance,
                    message: 'Cashout successful',
                    phoneNumber: user.phoneNumber
                });
            } catch (err) {
                console.error("Cashout Error:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Cashout failed' 
                });
            }
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}