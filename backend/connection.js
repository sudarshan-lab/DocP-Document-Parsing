const mongoose = require('mongoose');
require('dotenv').config();

const conParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}

//const uri = 'mongodb://localhost:27017/'
const uri = `mongodb+srv://skammu:A1s2d3123@cluster0.mbt28mb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const connection = mongoose.connect(uri, conParams).then(()=> console.log('connected')).catch((err)=> console.log(err));

module.exports = connection;