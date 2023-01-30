const { db } = require("../db");

const CoinController = {
    async getTotalCoins(req, res) {
        const { username } = req.params;
        var sum = 0;
        id = username.toUpperCase()
        if (!username) {
            res.send({ err: "Missing Information" })
        }
        const query1 = db.collection('coinMap')
            .where("getter", "==", id)
        const query2 = db.collection('coinMap')
            .where("setter", "==", id)

        query1.get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    if (doc.data().getter === id) {
                        sum += doc.data().value;
                    }
                });
                return query2.get();
            })
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    if (doc.data().setter === id) {
                        sum -= doc.data().value;
                    }
                });

                res.send({ totalCoins: sum })
            })
    },

};

module.exports = CoinController;
