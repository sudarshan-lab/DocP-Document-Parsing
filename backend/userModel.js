const mongoose = require('mongoose');
const schema = mongoose.Schema(
    {
        firstName: String,
        lastName: String,
        userName: String,
        email: String,
        password: String,
        role: String,
        // Email-OTP two-step verification
        twoFactorEnabled: { type: Boolean, default: false },
        otp: String,
        otpExpires: Date,
        lastTwoFactorNudge: Date,
    },
    {timestamps: true}
)

const User = mongoose.model('User',schema);
module.exports = User;
