// One-time migration: bcrypt-hash any existing plaintext passwords in place.
// Idempotent — already-hashed values (starting with "$2") are skipped, so the
// same password keeps working via bcrypt.compare on the next login.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const conn = require('./connection');
const User = require('./userModel');

(async () => {
  try {
    await conn;
    const users = await User.find({});
    let changed = 0;
    for (const u of users) {
      if (u.password && !u.password.startsWith('$2')) {
        u.password = await bcrypt.hash(u.password, 10);
        await u.save();
        changed++;
      }
    }
    console.log(`Password migration: hashed ${changed} of ${users.length} user(s).`);
  } catch (e) {
    console.error('migration error:', e && e.message);
  } finally {
    process.exit(0);
  }
})();
