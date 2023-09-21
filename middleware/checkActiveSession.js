const User = require("../models/User");

async function checkActiveSession(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (user.currentSession) {
      // Log out the old user by clearing their current session
      user.currentSession = null;
      await user.save();

      // Optionally, you can notify the old user that they've been logged out

      return next();
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, err });
  }
}

module.exports = checkActiveSession;
