const UserModel = require("../models/User");
const CoinController = require("./CoinController");

const ListController = {
  async getSaList(req, res) {
    const username = req.user.email.split("@")[0];
    try {
      const users = await UserModel.find({ companyId: username, level: 5 });
      res.send(users);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while retrieving SAs");
    }
  },
  async getSpList(req, res) {
    const username = req.user.email.split("@")[0];
    try {
      const users = await UserModel.find({ companyId: username, level: 6 });
      res.send(users);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while retrieving SPs");
    }
  },
  async getSsList(req, res) {
    const username = req.user.email.split("@")[0];
    try {
      const users = await UserModel.find({ companyId: username, level: 4 });
      res.send(users);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while retrieving SSs");
    }
  },
  async getScList(req, res) {
    const username = req.user.email.split("@")[0];
    try {
      const users = await UserModel.find({ companyId: username, level: 2 });
      res.send(users);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while retrieving SCs");
    }
  },
  async getMaList(req, res) {
    const username = req.user.email.split("@")[0];
    try {
      const users = await UserModel.find({ companyId: username, level: 7 });
      res.send(users);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while retrieving MAs");
    }
  },
  async getSstList(req, res) {
    const username = req.user.email.split("@")[0];
    try {
      const users = await UserModel.find({ companyId: username, level: 3 });
      res.send(users);
    } catch (err) {
      console.error(err);
      res.status(500).send("An error occurred while retrieving SSTs");
    }
  },
  async getAllList(req, res) {
    const username = req.user.email.split("@")[0];
    const users = await UserModel.find({ companyId: username });

    const usersWithBalance = await Promise.all(
      users.map(async (user) => {
        const downBalance = await CoinController.calculateDownBalance(
          user.username
        );
        return { ...user.toObject(), downBalance: downBalance };
      })
    );

    res.send(usersWithBalance);
  },
};

module.exports = ListController;
