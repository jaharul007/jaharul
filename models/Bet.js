// Bet Schema Definition (For reference only)

export const BetSchema = {
  phone: String,           // User phone number
  period: String,          // Game period ID
  mode: Number,            // Game mode (30, 60, 180, 300)
  betOn: String,           // What user bet on (number/color/size)
  betType: String,         // Type: number, color, size, random
  amount: Number,          // Bet amount
  multiplier: Number,      // Multiplier used
  status: String,          // pending, won, lost
  result: Number,          // Game result number (0-9)
  winAmount: Number,       // Amount won
  timestamp: Date,         // When bet was placed
  processedAt: Date        // When result was processed
};

export async function createBet(db, betData) {
  const bet = {
    ...betData,
    timestamp: new Date(),
    status: 'pending',
    result: null,
    winAmount: 0,
    processedAt: null
  };
  
  const result = await db.collection('bets').insertOne(bet);
  return { ...bet, _id: result.insertedId };
}

export async function getPendingBets(db, period, mode) {
  return await db.collection('bets')
    .find({ period, mode, status: 'pending' })
    .toArray();
}