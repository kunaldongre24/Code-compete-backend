const Ledger = require("../models/Ledger");

const countCash = async (username) => {
  let sum = 0;
  const id = username;
  if (!username) {
    res.send({ err: "Missing Information" });
  }

  const query = Ledger.find({ $or: [{ getter: id }, { setter: id }] });
  const snapshot = await query.exec();

  snapshot.forEach((doc) => {
    if (doc.getter === id) {
      const val = parseFloat(doc.value);
      sum += val ? val : 0;
    } else if (doc.setter === id) {
      const val = parseFloat(doc.value);
      sum -= val ? val : 0;
    }
  });
  return sum;
};

module.exports = countCash;
