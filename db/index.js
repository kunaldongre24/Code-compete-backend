const fs = require("firebase-admin");

const serviceAccount = require("./fly-bet-firebase-adminsdk-tt62u-f97f1f6de3.json");

fs.initializeApp({
  credential: fs.credential.cert(serviceAccount),
});
const db = fs.firestore();
module.exports = { fs };
