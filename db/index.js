const fs = require('firebase-admin');
const { FieldValue } = require("firebase-admin/firestore");

const serviceAccount = require('./fly-bet-firebase-adminsdk-tt62u-f97f1f6de3.json');

fs.initializeApp({
  credential: fs.credential.cert(serviceAccount)
});
const db = fs.firestore();
module.exports = { fs, db, FieldValue };
