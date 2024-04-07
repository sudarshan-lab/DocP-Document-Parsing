const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    addedDate: {
        type: Date,
        default: Date.now
    },
    modifiedDate: {
        type: Date,
        default: Date.now
    }
});

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
