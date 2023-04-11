const { db } = require("../db");

const countCash = async (username) => {
  let sum = 0;
  const id = username;
  if (!username) {
    res.send({ err: "Missing Information" });
  }
  const query1 = db.collection("ledger").where("getter", "==", id);
  const query2 = db.collection("ledger").where("setter", "==", id);

  const snapshot1 = await query1.get();
  snapshot1.forEach((doc) => {
    if (doc.data().getter === id) {
      const val = parseFloat(doc.data().value);
      sum += val ? val : 0;
    }
  });
  const snapshot2 = await query2.get();
  snapshot2.forEach((doc) => {
    if (doc.data().setter === id) {
      const val = parseFloat(doc.data().value);
      sum -= val ? val : 0;
    }
  });
  return sum;
};
module.exports = countCash;
