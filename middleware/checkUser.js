function checkPlayer(req, res, next) {
  const user = req.user;
  if (user && user.role === "user") {
    return next();
  } else {
    return res.status(401).json({ msg: "Unauthorized!" });
  }
}

module.exports = checkPlayer;
