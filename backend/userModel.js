const mongoose = require('mongoose');
const schema = mongoose.Schema(
    {
        firstName: String,
        lastName: String,
        userName: String,
        email: String,
        password: String,
        role:String
    },
    {timestamps: true}
)

const User = mongoose.model('User',schema);
module.exports = User;