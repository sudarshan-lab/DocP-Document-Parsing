const mongoose = require('mongoose');
const Contract = require('./contractModel.js'); // Import the Contract schema/model
const User = require('./userModel.js');

const extractedContractSchema = new mongoose.Schema({
    data: { 
        type: mongoose.Schema.Types.Mixed,
        required: true
     }, 
    contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Contract,
        required: true
    },
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required:true
    },
    fileS3Url: {
        type: String,
        required:true
    },
    fileName: {
        type: String,
        required:true
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

const ExtractedContract = mongoose.model('ExtractedContract', extractedContractSchema);

module.exports = ExtractedContract;