const Coin = require("../models/Coins");
const BetUserMap = require("../models/BetUserMap");
const MatchBetMap = require("../models/MatchBetMap");
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
        return res.json({ error: "Missing Information" });
      }
      const user = req.user.username;
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

  async calculateDownBalance(id) {
    try {
      const agentArr = await UserModel.find(
        { companyId: id },
        { username: 1, level: 1 }
      ).exec();
      const promises = agentArr.map(async (agent) => {
        const { username, level } = agent;
        const coins = await CoinController.countCoin(username);
        let downLine = 0;
        if (level !== 6) {
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
  async calculateUsedLimit(userId) {
    try {
      const pipeline = [
        {
          $match: {
            userId,
            settled: false,
          },
        },
        {
          $addFields: {
            priceValue: { $toDouble: "$priceValue" }, // Convert priceValue to a number
          },
        },
        {
          $group: {
            _id: null,
            sum: {
              $sum: {
                $cond: [
                  { $gt: ["$priceValue", 1] },
                  { $multiply: ["$stake", "$priceValue"] },
                  "$stake",
                ],
              },
            },
          },
        },
      ];
      const pipeline2 = [
        {
          $match: {
            userId,
            settled: false,
          },
        },
        {
          $addFields: {
            priceValue: { $toDouble: "$priceValue" }, // Convert priceValue to a number
            calculatedValue: {
              $cond: [
                {
                  $eq: ["$isBack", true], // Check if isBack is true
                },
                "$stake", // If true, use stake
                {
                  $divide: [
                    { $multiply: ["$stake", "$odds"] }, // Calculate (stake * odds) / 100
                    100,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            sum: {
              $sum: "$calculatedValue", // Sum the calculated values
            },
          },
        },
      ];

      // Now you can use the pipelineWithCondition in your aggregation query

      const [result] = await BetDataMap.aggregate(pipeline);
      const [matchResult] = await MatchBetMap.aggregate(pipeline2);

      const totalSum =
        ((result && result.sum) || 0) + ((matchResult && matchResult.sum) || 0);

      return totalSum;
    } catch (error) {
      console.error("Error calculating used limit:", error);
      throw error;
    }
  },
  async getDownbalance(req, res) {
    const { id } = req.params;
    const downBalance = await CoinController.calculateDownBalance(id);
    res.send({ downBalance });
  },
  async getUsedLimit(req, res) {
    const { userId } = req.params;
    const usedLimit = await CoinController.calculateUsedLimit(userId);
    res.send({ usedLimit });
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
      await CoinController.countAndUpdateCoin(id);

      res.send({ msg: "Deleted coins" });
    } catch (err) {
      console.error(err);
      res.send({ err: "Error deleting coins" });
    }
  },
};

module.exports = CoinController;
