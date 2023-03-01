const { db } = require("../db");

const CoinController = {
    async addCoins(data) {
        const { coins, msg, setter, getter } = data;
        const coinDb = db.collection('coinMap').doc(uuidv4());
        await coinDb.set({
            value: parseInt(coins),
            msg,
            getter,
            setter,
            createdOn: Date.now()
        });
    },
    async countCoin(username) {
        let sum = 0;
        const id = username;
        if (!username) {
            res.send({ err: "Missing Information" });
        }
        const query1 = db.collection("coinMap").where("getter", "==", id);
        const query2 = db.collection("coinMap").where("setter", "==", id);

        const snapshot1 = await query1.get();
        snapshot1.forEach((doc) => {
            if (doc.data().getter === id) {
                sum += doc.data().value;
            }
        });
        const snapshot2 = await query2.get();
        snapshot2.forEach((doc) => {
            if (doc.data().setter === id) {
                sum -= doc.data().value;
            }
        });
        return sum;
    },
    async getTotalCoins(req, res) {
        const { username } = req.params;
        const sum = await CoinController.countCoin(username);
        res.send({ totalCoins: sum })
    },

};

module.exports = CoinController;
