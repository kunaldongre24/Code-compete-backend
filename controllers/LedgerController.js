const { db } = require("../db");
const { v4: uuidv4 } = require("uuid");
const BetController = require("./BetController");
const { removeNum } = require("./CoinController");
const Ledger = require("../models/Ledger");

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
      const ledgerDb = new Ledger({
        value: parseFloat(ledger),
        note: note,
        getter: userId,
        setter: username,
        createdOn: Date.now(),
      });
      await ledgerDb.save();

      const p1Cash = await LedgerController.countCash(userId);
      const p2Cash = await LedgerController.countCash(username);

      let totalSum = 0;
      const matchUserMap = await MatchUserMap.find({ company: username });
      matchUserMap.forEach((doc) => {
        const sum = doc.sum;
        totalSum += parseFloat(sum);
      });

      const resultRef = new MatchUserMap({
        company: username,
        sum: parseFloat(ledger) * -1,
        total: totalSum - parseFloat(ledger),
        createdOn: Date.now(),
        matchname: "Cash Paid",
        type: "cash",
        note,
      });
      await resultRef.save();

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
      throw new Error("Missing Information");
    }
    const query = Ledger.where("$or", [{ getter: id }, { setter: id }]);
    const snapshot = await query.find();

    snapshot.forEach((doc) => {
      if (doc.get("getter") === id) {
        const val = parseFloat(doc.get("value"));
        sum += val ? val : 0;
      }
      if (doc.get("setter") === id) {
        const val = parseFloat(doc.get("value"));
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
      throw new Error("Missing Information");
    }
    const query = Ledger.where("$or", [{ getter: id }, { setter: id }]);
    const snapshot = await query.find();

    snapshot.forEach((doc) => {
      const data = doc.toObject();
      if (data.getter === id || data.setter === id) {
        arr.push(data);
      }
    });
    return arr;
  },
  async payCash(req, res) {
    try {
      const userId = req.user.email.split("@")[0];
      const { username, ledger, note } = req.body;
      const p1Cash = await Ledger.countCash(username);
      const p2Cash = await Ledger.countCash(userId);
      const ledgerDoc = await Ledger.create({
        value: parseFloat(ledger),
        note: note,
        getter: username,
        setter: userId,
        getterPreviousLimit: p1Cash,
        setterPreviousLimit: p2Cash,
        createdOn: Date.now(),
      });
      let totalSum = 0;
      const matchUserMaps = await MatchUserMap.find({ company: username });
      matchUserMaps.forEach((matchUserMap) => {
        const sum = matchUserMap.sum;
        totalSum += parseFloat(sum);
      });
      const matchUserMapDoc = await MatchUserMap.create({
        company: username,
        sum: parseFloat(ledger),
        total: totalSum + parseFloat(ledger),
        createdOn: Date.now(),
        matchName: "Cash Received",
        type: "cash",
        note,
        winner: userId,
        matchId: ledgerDoc._id,
        sid: 1, // You might want to update this value based on your logic
      });
      res.send({ status: 1, msg: "Cash Paid Successfully!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "An error occurred while paying cash" });
    }
  },
};

module.exports = LedgerController;
