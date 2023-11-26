const BetController = require("./BetController");
const { removeNum } = require("./CoinController");
const Ledger = require("../models/Ledger");
const User = require("../models/User");

const LedgerController = {
  async cashExposure(req, res) {
    const { username } = req.params;
    const cash = await LedgerController.countCash(username);
    const user = await User.findOne({ username }).exec();
    if (!user) {
      return res.send({ status: 0, msg: "User not found!" });
    }
    var exposure = 0;
    if (user.level === 6) {
      exposure = await BetController.getIndivisualPlayerExpo(user);
    } else {
      exposure = await BetController.getIndivisualCompanyExpo(user);
    }
    res.send({ exposure, cash });
  },
  async receiveCash(req, res) {
    try {
      const userId = req.user.username;
      const { username, ledger, note } = req.body;

      const p1Cash = await LedgerController.countCash(userId);
      const p2Cash = await LedgerController.countCash(username);
      const ledgerDb = new Ledger({
        value: parseFloat(ledger),
        note: note,
        getter: userId,
        setter: username,
        getterPreviousLimit: p1Cash,
        setterPreviousLimit: p2Cash,
        createdOn: Date.now(),
      });
      await ledgerDb.save();

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
  async getUserExposure(username) {
    const cash = await LedgerController.countCash(username);
    const user = await User.findOne({ username }).exec();
    if (!user) {
      return res.send({ status: 0, msg: "User not found!" });
    }
    var exposure = 0;
    if (user.level === 6) {
      exposure = await BetController.getIndivisualPlayerExpo(user);
    } else {
      exposure = await BetController.getIndivisualCompanyExpo(user);
    }
    return exposure + cash;
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
    return Math.round(sum * 100) / 100;
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
  async ledgerShow(req, res) {
    const { startDate, endDate, userId } = req.params;
    const resultArray = await BetController.getCompanyExp(
      userId,
      startDate,
      endDate
    );
    res.send(resultArray ? resultArray : []);
  },
  async getCashLedger(req, res) {
    const { startDate, endDate, userId } = req.params;
    const resultArray = await BetController.cashLedger(
      userId,
      startDate,
      endDate
    );
    res.send(resultArray ? resultArray : []);
  },
  async getMatchLedger(req, res) {
    const { startDate, endDate, userId } = req.params;
    const resultArray = await BetController.matchLedger(
      userId,
      startDate,
      endDate
    );
    res.send(resultArray ? resultArray : []);
  },
  async payCash(req, res) {
    try {
      const userId = req.user.username;
      const { username, ledger, note } = req.body;
      const p1Cash = await LedgerController.getUserExposure(username);
      const p2Cash = await LedgerController.getUserExposure(userId);
      await Ledger.create({
        value: parseFloat(ledger),
        note: note,
        getter: username,
        setter: userId,
        getterPreviousLimit: p1Cash,
        setterPreviousLimit: p2Cash,
        createdOn: Date.now(),
      });

      res.send({ status: 1, msg: "Cash Paid Successfully!" });
    } catch (err) {
      console.error(err);
      res.send({ status: 0, msg: "An error occurred while paying cash" });
    }
  },
};

module.exports = LedgerController;
