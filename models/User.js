// User Schema Definition (For reference only)

export const UserSchema = {
  phone: String,           // Unique identifier
  balance: Number,         // Current wallet balance
  totalDeposit: Number,    // Total deposited amount
  totalWithdraw: Number,   // Total withdrawn amount
  totalBets: Number,       // Number of bets placed
  totalWins: Number,       // Number of wins
  totalLosses: Number,     // Number of losses
  createdAt: Date,         // Account creation date
  updatedAt: Date          // Last update date
};

// Helper functions
export async function getUser(db, phone) {
  return await db.collection('users').findOne({ phone });
}

export async function createUser(db, phone, initialBalance = 100) {
  const newUser = {
    phone,
    balance: initialBalance,
    totalDeposit: 0,
    totalWithdraw: 0,
    totalBets: 0,
    totalWins: 0,
    totalLosses: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await db.collection('users').insertOne(newUser);
  return newUser;
}

export async function updateBalance(db, phone, amount) {
  const result = await db.collection('users').findOneAndUpdate(
    { phone },
    { 
      $inc: { balance: amount },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );
  
  return result.value;
}