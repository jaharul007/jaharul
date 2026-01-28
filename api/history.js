import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { mode, page } = req.query;
    const currentMode = parseInt(mode) || 60;
    const currentPage = parseInt(page) || 1;
    const perPage = 10;

    const client = await clientPromise;
    const db = client.db('wingo_game');
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

    res.status(200).json(formatted);

  } catch (error) {
    console.error('History API error:', error);
    res.status(500).json([]);
  }
}