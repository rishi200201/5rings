const mongoose = require('mongoose');

const connectDatabase = () => {
    const DB_URI = process.env.MONGODB_URI || process.env.DB_LEARNING;
    if (!DB_URI) {
      console.error('MONGODB_URI is not set. Please configure your .env file.');
      process.exit(1);
    }
    
    mongoose.connect(DB_URI)
    .then(con => {
        console.log(`MongoDB connected: ${con.connection.host}`);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });
}

module.exports = connectDatabase;