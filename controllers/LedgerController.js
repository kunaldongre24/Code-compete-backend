const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");
const BetController = require("./BetController");
const { removeNum } = require("./CoinController");

const LedgerController = {
  async cashExposure(req, res) {
    const { username } = req.params;
    const cash = await LedgerController.countCash(username);
    var exposure = 0;
    if (removeNum(username) === "sp") {
      exposure = await BetController.getPlayerExposure("all", username);
    } else {
      exposure = await BetController.getAgentExposure("all", username);
    }
    res.send({ exposure: exposure.final, cash });
  },
  async receiveCash(req, res) {
    try {
      const userId = req.user.email.split("@")[0];
      const { username, ledger, note } = req.body;
      const ledgerDb = db.collection("ledger").doc(uuidv4());
      const p1Cash = await LedgerController.countCash(userId);
      const p2Cash = await LedgerController.countCash(username);
      await ledgerDb.set({
        value: parseFloat(ledger),
        note: note,
        getter: userId,
        setter: username,
        getterPreviousLimit: p1Cash,
        setterPreviousLimit: p2Cash,
        createdOn: Date.now(),
      });
      let totalSum = 0;
      const sumRef = db
        .collection("matchUserMap")
        .where("company", "==", username);
      const querySnapshot = await sumRef.get();
      querySnapshot.forEach((doc) => {
        const sum = doc.data().sum;
        totalSum += parseFloat(sum);
      });
      const resultRef = db.collection("matchUserMap").doc(uuidv4());
      resultRef.set({
        company: username,
        sum: parseFloat(ledger) * -1,
        total: totalSum - parseFloat(ledger),
        createdOn: Date.now(),
        matchname: "Cash Paid",
        type: "cash",
        note,
      });
      res.send({ status: 1, msg: "Cash Received Successfully!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "An error occurred while receiving cash" });
    }
  },
  async getUserCash(req, res) {
    const { username } = req.params;
    const cash = await LedgerController.countCash(username);
    res.send({ totalCash: Math.round(cash * 100) / 100 });
  },
  async countCash(username) {
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
  },
  async getExpoLedger(req, res) {
    const { username } = req.params;
    const response = await LedgerController.getLedger(username);
    res.send(response);
  },
  async getLedger(username) {
    let arr = [];
    const id = username;
    if (!username) {
      res.send({ err: "Missing Information" });
    }
    const query1 = db.collection("ledger").where("getter", "==", id);
    const query2 = db.collection("ledger").where("setter", "==", id);

    const snapshot1 = await query1.get();
    snapshot1.forEach((doc) => {
      if (doc.data().getter === id) {
        arr.push(doc.data());
      }
    });
    const snapshot2 = await query2.get();
    snapshot2.forEach((doc) => {
      if (doc.data().setter === id) {
        arr.push(doc.data());
      }
    });
    return arr;
  },
  async payCash(req, res) {
    try {
      const userId = req.user.email.split("@")[0];
      const { username, ledger, note } = req.body;
      const ledgerDb = db.collection("ledger").doc(uuidv4());
      const p1Cash = await LedgerController.countCash(username);
      const p2Cash = await LedgerController.countCash(userId);
      await ledgerDb.set({
        value: parseFloat(ledger),
        note: note,
        getter: username,
        setter: userId,
        getterPreviousLimit: p1Cash,
        setterPreviousLimit: p2Cash,
        createdOn: Date.now(),
      });
      let totalSum = 0;
      const sumRef = db
        .collection("matchUserMap")
        .where("company", "==", username);
      const querySnapshot = await sumRef.get();
      querySnapshot.forEach((doc) => {
        const sum = doc.data().sum;
        totalSum += parseFloat(sum);
      });
      const resultRef = db.collection("matchUserMap").doc(uuidv4());
      resultRef.set({
        company: username,
        sum: parseFloat(ledger),
        total: totalSum + parseFloat(ledger),
        createdOn: Date.now(),
        matchname: "Cash Received",
        type: "cash",
        note,
      });
      res.send({ status: 1, msg: "Cash Paid Successfully!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "An error occurred while paying cash" });
    }
  },
};

module.exports = LedgerController;