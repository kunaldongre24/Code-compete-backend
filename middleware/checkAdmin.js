function checkAdmin(req, res, next) {
  const user = req.user;
  if (user && user.level < 6 && user.level > 0) {
    return next();
  } else {
    return res.status(401).json({ msg: "Unauthorized: User level too low" });
  }
}

module.exports = checkAdmin;
