const fs = require('firebase-admin');
const checkAuth = (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(403).send({ error: 'Unauthorized' });
    return;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];

  fs.auth().verifyIdToken(idToken)
    .then((decodedIdToken) => {
      req.user = decodedIdToken;
      next();
    })
    .catch((error) => {
      res.status(403).send({ error: 'Unauthorized' });
    });
}

module.exports = checkAuth;
  