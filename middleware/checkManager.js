function checkManager(req, res, next) {
  const user = req.user;
  if (user && user.level === 7) {
    return next();
  } else {
    return res.status(401).json({ msg: "Unauthorized!" });
  }
}

module.exports = checkManager;
