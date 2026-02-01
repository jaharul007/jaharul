// db.js
const mongoose = require('mongoose');
const connectionString = process.env.MONGODB_URI; 

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(connectionString);
};
module.exports = connectDB;
