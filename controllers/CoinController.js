const Coin = require("../models/Coins");
const BetUserMap = require("../models/BetUserMap");
const MatchBetMap = require("../models/MatchBetMap");
const MatchUserMap = require("../models/MatchUserMap");
const BetDataMap = require("../models/BetDataMap");
const UserModel = require("../models/User");
const positionCalculator = require("../helper/positionCalculator");

const cache = {};

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
    try {
      const [totalCoins, user] = await Promise.all([
        CoinController.countCoin(username),
        UserModel.findOne({ username: username }),
      ]);
      if (!user) {
        console.log("No matching user.");
        return;
      }
      user.totalCoins = Math.round(parseFloat(totalCoins) * 100) / 100;
      await user.save();
    } catch (error) {
      console.log(`An error occurred: ${error.message}`);
    }
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
    try {
      const { type, username, amount } = req.body;
      if (
        type === undefined ||
        username === undefined ||
        amount === undefined
      ) {
        return res.status(400).json({ error: "Missing Information" });
      }
      const userEmail = req.user.email;
      const user = userEmail.split("@")[0].toLowerCase();
      const getterInfo = await UserModel.findOne({ username: username });
      if (getterInfo.companyId !== user) {
        return;
      }
      let totalCoins = 0;
      if (user === "cc0001") {
        totalCoins = Number.MAX_SAFE_INTEGER;
      } else {
        totalCoins = await CoinController.countCoin(user);
      }
      const playerCoins = await CoinController.countCoin(
        username.toLowerCase()
      );
      const userInfo = await UserModel.findOne({ username: username }).exec();
      if (!CoinController.isNumber(parseInt(amount)) || amount <= 0) {
        console.log("Invalid Amount");
        return res.send({ status: 0, msg: "Invalid Amount" });
      }
      console.log(playerCoins, amount, username);

      if (parseInt(type) === 0 && playerCoins < amount) {
        return res.send({ status: 0, msg: "User limit exceed" });
      }
      if (parseInt(type) === 1 && userInfo.level !== 1 && totalCoins < amount) {
        return res.send({ status: 0, msg: "Insufficient Balance" });
      }

      if (!userInfo) {
        return res.status(404).json({ error: "User not found" });
      }
      const userDisplayName = userInfo.name;
      const p1Coins = await CoinController.countCoin(user);
      const p2Coins = playerCoins;
      const msg =
        parseInt(type) === 1
          ? `Limit increased of ${userDisplayName}(${username}) by ${req.user.name}(${user})`
          : `Limit decreased of ${userDisplayName}(${username}) by ${req.user.name}(${user})`;
      const coinRecord = {
        value: Math.abs(parseFloat(amount)),
        msg,
        getter: parseInt(type) === 1 ? username : user,
        setter: parseInt(type) === 1 ? user : username,
        getterPreviousLimit: parseInt(type) === 1 ? p2Coins : p1Coins,
        setterPreviousLimit: parseInt(type) === 1 ? p1Coins : p2Coins,
        createdOn: new Date(),
        type: 8,
      };
      await CoinController.createCoinRecord(coinRecord);
      await CoinController.countAndUpdateCoin(username.toLowerCase());
      await CoinController.countAndUpdateCoin(user);
      return res.send({
        status: 1,
        msg: parseInt(type) === 1 ? "Limit Increased" : "Limit Decreased",
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .send({ status: 0, error: "Server Error Occurred" });
    }
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
  async getUsedLimit(id) {
    const { matchId } = req.params;
    var sum = 0;
    const matchBetData = await MatchBetMap.find({
      matchId: matchId,
      userId: id,
    });
    const url = `http://139.144.12.137/getbm2?eventId=${matchId}`;
    const response = await axios.get(url);
    if (response.data.t2 && response.data.t2.length) {
      let resp = response.data.t2[0].bm1;
      resp = await positionCalculator(matchBetData, resp);
      let negativeSum = 0;
      for (let i = 0; i < resp.length; i++) {
        if (resp[i].position && resp[i].position < 0) {
          if (negativeSum > resp[i].position) {
            negativeSum = resp[i].position;
          }
        }
      }
      sum += negativeSum;
    }

    const fancyBetData = await BetDataMap.find({
      matchId,
      userId: id,
      settled: false,
    });

    const liveBets = fancyBetData;
    const pairedIds = [];

    for (let i = 0; i < liveBets.length; i++) {
      const bet1 = liveBets[i];
      if (pairedIds.includes(bet1._id)) {
        continue;
      }

      for (let j = i + 1; j < liveBets.length; j++) {
        const bet2 = liveBets[j];

        if (pairedIds.includes(bet2._id)) {
          continue;
        }
        if (bet1.fancyName === bet2.fancyName) {
          if (
            (bet1.isBack && !bet2.isBack && bet1.odds <= bet2.odds) ||
            (!bet1.isBack && bet2.isBack && bet1.odds >= bet2.odds)
          ) {
            const amount1 = Math.round(bet1.stake * 100) / 100;
            const amount2 = Math.round(bet2.stake * 100) / 100;
            const stakeDiff = Math.abs(amount1 - amount2);
            const amount3 =
              Math.round(bet1.stake * bet1.priceValue * 100) / 100;
            const amount4 =
              Math.round(bet2.stake * bet2.priceValue * 100) / 100;
            const lossDiff = Math.abs(amount3 - amount4);
            const max = Math.max(stakeDiff, lossDiff);
            sum += max;
            pairedIds.push(bet1._id, bet2._id);

            break;
          }
        }
      }
      if (!pairedIds.includes(bet1._id)) {
        const rate1 = bet1.priceValue > 1 ? bet1.priceValue : 1;
        const amount = Math.round(bet1.stake * rate1 * 100) / 100;
        sum += amount;
      }
    }
  },
  async calculateDownBalance(id) {
    try {
      const agentArr = await UserModel.find(
        { companyId: id },
        { username: 1 }
      ).exec();
      const promises = agentArr.map(async (agent) => {
        const { username } = agent;
        const coins = await CoinController.countCoin(username);
        let downLine = 0;
        if (CoinController.removeNum(username) !== "sp") {
          downLine = await CoinController.calculateDownBalance(username);
        }
        return coins + downLine;
      });
      const results = await Promise.all(promises);
      const downBalance = results.reduce((total, value) => total + value, 0);
      const cachedBalance = cache[id];
      if (cachedBalance !== undefined && cachedBalance !== downBalance) {
        cache[id] = downBalance;
      }
      return downBalance;
    } catch (err) {
      console.error(err);
      return 0;
    }
  },
  async getDownbalance(req, res) {
    const { id } = req.params;
    const downBalance = await CoinController.calculateDownBalance(id);
    res.send({ downBalance });
  },
  async countCoin(username) {
    if (CoinController.removeNum(username) === "sp") {
      return CoinController.countPlayerCoin(username);
    } else {
      return CoinController.countAgentLimit(username);
    }
  },
  async countPlayerCoin(username) {
    const id = username;

    if (!id) {
      throw new Error("Missing Information");
    }

    try {
      const pipeline = [
        {
          $match: {
            $or: [{ getter: id }, { setter: id }],
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  { $eq: ["$getter", id] },
                  { $toDouble: "$value" },
                  { $multiply: [{ $toDouble: "$value" }, -1] },
                ],
              },
            },
          },
        },
      ];

      const result = await Coin.aggregate(pipeline).exec();
      const sum = result.length > 0 ? result[0].total : 0;

      return sum;
    } catch (error) {
      console.log(`An error occurred: ${error.message}`);
      throw error;
    }
  },
  async countAgentLimit(username) {
    if (!username) {
      return { err: "Missing Information" };
    }

    const result = await Coin.aggregate([
      {
        $match: {
          $or: [{ getter: username }, { setter: username }],
          type: { $ne: 3 },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ["$getter", username] },
                { $toDouble: "$value" },
                { $subtract: [0, { $toDouble: "$value" }] },
              ],
            },
          },
        },
      },
    ]).exec();

    return result.length > 0 ? result[0].total : 0;
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
    await CoinController.countAndUpdateCoin(username);
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
