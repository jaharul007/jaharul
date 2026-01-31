import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules mein __dirname set karne ke liye
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// 1. STATIC FILES (HTML/CSS/JS) SETUP
// ============================================
// Aapne kaha ki aapka folder "files" naam se hai.
// Ye line ensure karegi ki link kholte hi "files/index.html" dikhe.
app.use(express.static(path.join(__dirname, 'files')));

// ============================================
// 2. MONGODB CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wingo_game';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
// 3. API ROUTES LINKING (ES Modules Style)
// ============================================
// Railway crashes se bachne ke liye ye sahi tarika hai:
import loginRoute from './api/login.js';
import registerRoute from './api/register.js';
import balanceRoute from './api/balance.js';
import betRoute from './api/bet.js';
import historyRoute from './api/history.js';
import myhistoryRoute from './api/myhistory.js';
import userRoute from './api/user.js';
import processResults from './api/process-results.js';
import saveResult from './api/save-result.js';
import addResult from './api/add-result.js';

// Connecting routes to Express
app.use('/api/login', loginRoute);
app.use('/api/register', registerRoute);
app.use('/api/balance', balanceRoute);
app.use('/api/bet', betRoute);
app.use('/api/history', historyRoute);
app.use('/api/myhistory', myhistoryRoute);
app.use('/api/user', userRoute);
app.use('/api/process-results', processResults);
app.use('/api/save-result', saveResult);
app.use('/api/add-result', addResult);

// ============================================
// 4. DEFAULT ROUTE (Index.html Load karne ke liye)
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'files', 'index.html'));
});

// ============================================
// 5. START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📂 Serving static files from: /files folder`);
});
