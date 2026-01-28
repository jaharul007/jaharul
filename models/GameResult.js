// Game Result Schema Definition (For reference only)

export const GameResultSchema = {
  period: String,          // Unique period identifier
  mode: Number,            // Game mode (30, 60, 180, 300)
  number: Number,          // Result number (0-9)
  timestamp: Date          // When result was generated
};

export async function createResult(db, period, mode, number) {
  const result = {
    period,
    mode,
    number,
    timestamp: new Date()
  };
  
  await db.collection('results').insertOne(result);
  return result;
}

export async function getHistory(db, mode, limit = 10) {
  return await db.collection('results')
    .find({ mode })
    .sort({ period: -1 })
    .limit(limit)
    .toArray();
}