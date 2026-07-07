const mongoose = require('mongoose');
require('dotenv').config();

const conParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}

// DB connection string comes from backend/.env (MONGO_URI); falls back to a local MongoDB for dev.
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/docp';

const connection = mongoose.connect(uri, conParams).then(()=> console.log('connected')).catch((err)=> console.log(err));

module.exports = connection;