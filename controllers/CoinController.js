const Coin = require("../models/Coins");
const BetUserMap = require("../models/BetUserMap");
const MatchBetMap = require("../models/MatchBetMap");
const MatchUserMap = require("../models/MatchUserMap");
const BetDataMap = require("../models/BetDataMap");
const UserModel = require("../models/User");

const CoinController = {
  async addCoins(data) {
    const { coins, msg, setter, getter } = data;
    await Coin.create({
      value: coins,
      msg,
      getter,
      setter,
      createdOn: Date.now(),
    });
    await CoinController.countAndUpdateCoin(getter.toLowerCase());
    await CoinController.countAndUpdateCoin(setter.toLowerCase());
  },
  removeNum(text) {
    return text.replace(/[0-9]/g, "");
  },
  async countAndUpdateCoin(username) {
    const valid = ["sc", "cc", "sst", "sa", "ss"];
    const id = CoinController.removeNum(username);
    if (valid.includes(id)) {
      return CoinController.updateAgentCoin(username);
    }
    const totalCoins = await CoinController.countCoin(username);
    const user = await UserModel.findOne({ username: username });
    if (!user) {
      console.log("No matching user.");
      return;
    }
    user.totalCoins = Math.round(parseFloat(totalCoins) * 100) / 100;
    await user.save();
  },
  async updateAgentCoin(username) {
    const totalCoins = await CoinController.countAgentLimit(username);
    const user = await UserModel.findOne({ username: username });
    if (!user) {
      console.log("User not found");
      return;
    }
    user.totalCoins = Math.round(parseFloat(totalCoins) * 100) / 100;
    await user.save();
  },
  isNumber(n) {
    return typeof n === "number" && !isNaN(n);
  },
  async limitControl(req, res) {
    const { type, username, amount } = req.body;
    if (type === undefined || username === undefined || amount === undefined) {
      return res.status(400).json({ error: "Missing Information" });
    }
    const userEmail = req.user.email;
    const user = userEmail.split("@")[0];
    const totalCoins = await CoinController.countCoin(user.toLowerCase());
    const playerCoins = await CoinController.countCoin(username.toLowerCase());
    const userQuery = UserModel.findOne({ username: username });
    const userInfo = await userQuery.exec();
    if (!CoinController.isNumber(parseInt(amount)) || amount <= 0) {
      console.log("Invalid Amount");
      res.send({ status: 0, msg: "Invalid Amount" });
      return;
    }
    console.log(playerCoins, amount, username);

    if (parseInt(type) === 0 && playerCoins < amount) {
      res.send({ status: 0, msg: "User limit exceed" });
      return;
    }
    if (
      parseInt(type) === 1 &&
      parseInt(userInfo.level) !== 1 &&
      totalCoins < amount
    ) {
      res.send({ status: 0, msg: "Insufficient Balance" });
      return;
    }

    if (!userInfo) {
      return res.status(404).json({ error: "User not found" });
    }
    const userDisplayName = userInfo.name;
    const p1Coins = await CoinController.countCoin(user);
    const p2Coins = await CoinController.countCoin(username);
    if (parseInt(type) === 1) {
      const msg = `Limit increased of ${userDisplayName}(${username}) by ${req.user.name}(${user})`;
      await CoinController.createCoinRecord({
        value: Math.abs(parseFloat(amount)),
        msg,
        getter: username,
        setter: user,
        getterPreviousLimit: p2Coins,
        setterPreviousLimit: p1Coins,
        createdOn: new Date(),
        type: 8,
      });
    } else if (parseInt(type) === 0) {
      const msg = `Limit decreased of ${userDisplayName}(${username}) by ${req.user.name}(${user})`;
      await CoinController.createCoinRecord({
        value: Math.abs(parseFloat(amount)),
        msg,
        getter: user,
        setter: username,
        getterPreviousLimit: p1Coins,
        setterPreviousLimit: p2Coins,
        createdOn: new Date(),
        type: 8,
      });
    } else {
      return res.status(400).json({ error: "Unknown Error Occurred" });
    }
    await CoinController.countAndUpdateCoin(username.toLowerCase());
    await CoinController.countAndUpdateCoin(user.toLowerCase());
    res.send({
      status: 1,
      msg: parseInt(type) === 1 ? "Limit Increased" : "Limit Decreased",
    });
  },
  async createCoinRecord({
    getter,
    setter,
    value,
    type,
    msg,
    getterPreviousLimit,
    setterPreviousLimit,
  }) {
    const coin = new Coin({
      getter,
      setter,
      value,
      type: type,
      getterPreviousLimit,
      setterPreviousLimit,
      msg,
      createdOn: Date.now(),
    });

    try {
      const savedCoin = await coin.save();
      return savedCoin;
    } catch (error) {
      console.error("Error saving coin:", error);
      return { err: error };
    }
  },
  async countCoin(username) {
    let sum = 0;
    const id = username;
    if (!username) {
      return { err: "Missing Information" };
    }
    const query = Coin.find({ $or: [{ getter: id }, { setter: id }] });

    const snapshot = await query.lean().exec();
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
  },
  async countAgentLimit(username) {
    let sum = 0;
    const id = username;
    if (!username) {
      return { err: "Missing Information" };
    }
    const query = Coin.find({
      $or: [{ getter: id }, { setter: id }],
      type: { $ne: 3 },
    });

    const snapshot = await query.lean().exec();
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
  },
  async getLimit(username) {
    const id = username;
    if (!id) {
      return { err: "Missing Information" };
    }

    try {
      const query = Coin.find({
        $or: [
          { getter: id, type: 8 },
          { setter: id, type: 8 },
          { getter: id, type: 1 },
          { setter: id, type: 1 },
        ],
      });
      const results = await query.lean().exec();
      return results;
    } catch (err) {
      console.error(err);
      return { err: "Failed to retrieve limit data" };
    }
  },
  async getTotalCoins(req, res) {
    const { username } = req.params;
    const sum = await CoinController.countCoin(username);
    res.send({ totalCoins: Math.round(sum * 100) / 100 });
  },
  async getUserLimit(req, res) {
    const { username } = req.params;
    const response = await CoinController.getLimit(username);
    res.send(response);
  },
  async getAgentLimit(req, res) {
    const { username } = req.params;
    const sum = await CoinController.countAgentLimit(username);
    res.send({ totalCoins: Math.round(sum * 100) / 100 });
  },
  async deleteBetCoins(req, res) {
    const { id } = req.params;
    try {
      await Coin.deleteMany({ setter: id });
      await MatchBetMap.deleteMany({ userId: id });
      await BetDataMap.deleteMany({ userId: id });
      await Coin.deleteMany({ getter: id, value: { $lte: 10000 } });
      await Coin.deleteMany({ getter: id, type: 8 });
      await BetUserMap.deleteMany({ player: id });
      await MatchUserMap.deleteMany({ company: id });

      await CoinController.countAndUpdateCoin(id);

      res.send({ msg: "Deleted coins" });
    } catch (err) {
      console.error(err);
      res.status(500).send({ err: "Error deleting coins" });
    }
  },
};

module.exports = CoinController;
