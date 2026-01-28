const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const mongoUrl = 'mongodb://localhost:27017';
const client = new MongoClient(mongoUrl);
let db;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        db = client.db('wingo_game');
        console.log('✅ Connected to MongoDB');
        
        await db.collection('users').createIndex({ phone: 1 }, { unique: true });
        await db.collection('bets').createIndex({ phone: 1, period: 1, mode: 1 });
        await db.collection('history').createIndex({ period: 1, mode: 1 }, { unique: true });
        
        console.log('✅ Indexes created');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Get user balance
app.get('/api/user', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.json({ success: false, message: 'Phone required' });
        }
        
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ phone: phone });
        
        if (!user) {
            const newUser = {
                phone: phone,
                balance: 1000.00,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            await usersCollection.insertOne(newUser);
            return res.json({ success: true, balance: 1000.00 });
        }
        
        res.json({ success: true, balance: user.balance || 0 });
        
    } catch (error) {
        console.error('Get user error:', error);
        res.json({ success: false, message: 'Server error' });
    }
});

// Place a bet
app.post('/api/bet', async (req, res) => {
    try {
        const betData = req.body;
        const { phone, amount, period, mode, betOn } = betData;
        
        if (!phone || !amount || !period || !mode || !betOn) {
            return res.json({ success: false, message: 'Missing required fields' });
        }
        
        const usersCollection = db.collection('users');
        const betsCollection = db.collection('bets');
        
        const user = await usersCollection.findOne({ phone: phone });
        
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        if (user.balance < amount) {
            return res.json({ success: false, message: 'Insufficient balance' });
        }
        
        const newBalance = user.balance - amount;
        await usersCollection.updateOne(
            { phone: phone },
            { 
                $set: { 
                    balance: newBalance,
                    updatedAt: new Date()
                } 
            }
        );
        
        let betType = 'number';
        if (['Green', 'Red', 'Violet'].includes(betOn)) {
            betType = 'color';
        } else if (['Big', 'Small'].includes(betOn)) {
            betType = 'size';
        } else if (betOn === 'Random') {
            betType = 'random';
        }
        
        const bet = {
            phone: phone,
            period: period,
            mode: parseInt(mode),
            betOn: betOn,
            betType: betType,
            amount: parseFloat(amount),
            multiplier: betData.multiplier || 1,
            status: 'pending',
            timestamp: new Date(betData.timestamp || Date.now()),
            createdAt: new Date()
        };
        
        await betsCollection.insertOne(bet);
        
        console.log(`✅ Bet placed: ${phone} - ${betOn} - ₹${amount} - Period: ${period}`);
        
        res.json({ 
            success: true, 
            message: 'Bet placed successfully',
            newBalance: newBalance,
            betId: bet._id
        });
        
    } catch (error) {
        console.error('Bet placement error:', error);
        res.json({ success: false, message: 'Server error' });
    }
});

// Get user's betting history
app.get('/api/myhistory', async (req, res) => {
    try {
        const { phone, mode } = req.query;
        
        if (!phone) {
            return res.json({ success: false, message: 'Phone required' });
        }
        
        const betsCollection = db.collection('bets');
        
        const query = { phone: phone };
        if (mode) {
            query.mode = parseInt(mode);
        }
        
        const bets = await betsCollection
            .find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        
        res.json({ success: true, bets: bets });
        
    } catch (error) {
        console.error('My history error:', error);
        res.json({ success: false, message: 'Server error' });
    }
});

// Get game history
app.get('/api/history', async (req, res) => {
    try {
        const { mode, page } = req.query;
        const currentMode = parseInt(mode) || 60;
        const currentPage = parseInt(page) || 1;
        const perPage = 10;
        
        const historyCollection = db.collection('history');
        
        const history = await historyCollection
            .find({ mode: currentMode })
            .sort({ period: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage)
            .toArray();
        
        const formatted = history.map(h => ({
            p: h.period,
            n: h.number,
            mode: h.mode
        }));
        
        res.json(formatted);
        
    } catch (error) {
        console.error('History error:', error);
        res.json([]);
    }
});

// Add new result
app.post('/api/add-result', async (req, res) => {
    try {
        const { period, mode, number } = req.body;
        
        if (!period || mode === undefined || number === undefined) {
            return res.json({ success: false, message: 'Missing data' });
        }
        
        const historyCollection = db.collection('history');
        
        const existing = await historyCollection.findOne({ 
            period: period, 
            mode: parseInt(mode) 
        });
        
        if (existing) {
            return res.json({ success: false, message: 'Result already exists' });
        }
        
        const result = {
            period: period,
            mode: parseInt(mode),
            number: parseInt(number),
            timestamp: new Date(),
            createdAt: new Date()
        };
        
        await historyCollection.insertOne(result);
        
        console.log(`✅ Result added: Period ${period} - Number ${number}`);
        
        await processBetsForPeriod(period, parseInt(mode), parseInt(number));
        
        res.json({ success: true, message: 'Result added' });
        
    } catch (error) {
        console.error('Add result error:', error);
        res.json({ success: false, message: 'Server error' });
    }
});

// Process results for a period
app.post('/api/process-results', async (req, res) => {
    try {
        const { period, mode } = req.body;
        
        if (!period || !mode) {
            return res.json({ success: false, message: 'Missing data' });
        }
        
        const historyCollection = db.collection('history');
        
        const result = await historyCollection.findOne({ 
            period: period, 
            mode: parseInt(mode) 
        });
        
        if (!result) {
            return res.json({ success: false, message: 'Result not found yet' });
        }
        
        await processBetsForPeriod(period, parseInt(mode), result.number);
        
        res.json({ success: true, message: 'Results processed' });
        
    } catch (error) {
        console.error('Process results error:', error);
        res.json({ success: false, message: 'Server error' });
    }
});

// Helper function to process all bets
async function processBetsForPeriod(period, mode, winningNumber) {
    try {
        const betsCollection = db.collection('bets');
        const usersCollection = db.collection('users');
        
        const pendingBets = await betsCollection.find({
            period: period,
            mode: mode,
            status: 'pending'
        }).toArray();
        
        console.log(`Processing ${pendingBets.length} bets for period ${period}, number ${winningNumber}`);
        
        for (let bet of pendingBets) {
            let isWin = false;
            let winMultiplier = 0;
            
            if (bet.betType === 'number') {
                if (parseInt(bet.betOn) === winningNumber) {
                    isWin = true;
                    winMultiplier = 9;
                }
            } else if (bet.betType === 'color') {
                if (bet.betOn === 'Green' && [1, 3, 7, 9].includes(winningNumber)) {
                    isWin = true;
                    winMultiplier = 2;
                } else if (bet.betOn === 'Red' && [2, 4, 6, 8].includes(winningNumber)) {
                    isWin = true;
                    winMultiplier = 2;
                } else if (bet.betOn === 'Violet' && [0, 5].includes(winningNumber)) {
                    isWin = true;
                    winMultiplier = 4.5;
                }
            } else if (bet.betType === 'size') {
                if (bet.betOn === 'Big' && winningNumber >= 5) {
                    isWin = true;
                    winMultiplier = 2;
                } else if (bet.betOn === 'Small' && winningNumber < 5) {
                    isWin = true;
                    winMultiplier = 2;
                }
            }
            
            const updateData = {
                status: isWin ? 'won' : 'lost',
                resultNumber: winningNumber,
                processedAt: new Date()
            };
            
            if (isWin) {
                const winAmount = bet.amount * winMultiplier;
                updateData.winAmount = winAmount;
                
                await usersCollection.updateOne(
                    { phone: bet.phone },
                    { 
                        $inc: { balance: winAmount },
                        $set: { updatedAt: new Date() }
                    }
                );
                
                console.log(`✅ Win: ${bet.phone} won ₹${winAmount}`);
            } else {
                console.log(`❌ Loss: ${bet.phone} lost ₹${bet.amount}`);
            }
            
            await betsCollection.updateOne(
                { _id: bet._id },
                { $set: updateData }
            );
        }
        
    } catch (error) {
        console.error('Process bets error:', error);
    }
}

// Auto result generation
function startAutoResultGeneration() {
    const modes = [30, 60, 180, 300];
    
    setInterval(() => {
        modes.forEach(async (mode) => {
            try {
                const now = new Date();
                const total = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
                
                if (total % mode === 0) {
                    const dateStr = now.getFullYear().toString() + 
                                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                                   now.getDate().toString().padStart(2, '0');
                    const period = dateStr + (Math.floor(total / mode) - 1).toString().padStart(4, '0');
                    const number = Math.floor(Math.random() * 10);
                    
                    const historyCollection = db.collection('history');
                    
                    const exists = await historyCollection.findOne({ period, mode });
                    
                    if (!exists) {
                        await historyCollection.insertOne({
                            period: period,
                            mode: mode,
                            number: number,
                            timestamp: new Date(),
                            createdAt: new Date()
                        });
                        
                        console.log(`🎲 Auto result: Mode ${mode}, Period ${period}, Number ${number}`);
                        
                        await processBetsForPeriod(period, mode, number);
                    }
                }
            } catch (error) {
                console.error('Auto result error:', error);
            }
        });
    }, 1000);
}

// Start server
app.listen(PORT, async () => {
    await connectDB();
    console.log(`✅ Server running on http://localhost:${PORT}`);
    
    startAutoResultGeneration();
    console.log('🎲 Auto result generation started');
});

process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});