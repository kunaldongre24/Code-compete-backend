const { db } = require("../db");
const { v4: uuidv4 } = require('uuid');
const axios = require("axios");
const CoinController = require("./CoinController");
const CommissionController = require("./CommissionController");
const { betWinning } = require("./CommissionController");


const BetController = {
    async settleBet(req, res) {
        var distList = [];
        const { fancyName, value } = req.body;
        if (fancyName === undefined || fancyName.trim() === "" || value === undefined || value.trim() === "") {
            return res.send({ err: "Missing Information" });
        }
        var won = false;
        const betRef = db.collection('betDataMap')
            .where("fancyName", "==", fancyName);
        const response = await betRef.get();
        const data = response.docs.map(doc => doc.data());
        for (i = 0; i < data.length; i++) {
            const { isBack, odds, stake, priceValue, userId, fancyName } = data[i];
            const loss = priceValue > 1 ? Math.round(stake * priceValue * 100) / 100 : stake;
            const profit = priceValue > 1 ? stake : Math.round(stake * priceValue * 100) / 100;
            if (isBack) {
                if (value >= odds) {
                    won = true;
                }
                else {
                    won = false;
                }
            }
            else {
                if (value < odds) {
                    won = true;
                }
                else {
                    won = false;
                }
            }
            if (won) {
                distList = await CommissionController.disburseCoin(userId, profit * -1);
            }
            else {
                distList = await CommissionController.disburseCoin(userId, loss);
            }
            for (var i = 0; i < distList.length; i++) {
                await betWinning(distList[i].id, distList[i].commission, userId, fancyName);
            }
            
        }
        //settling the bet after all the bet money is been distributed.
        res.send({ msg: "done reading" })

    },
    async getBetsByMatchId(req, res) {
        const { matchId } = req.params;
        const userRef = db.collection('betDataMap')
            .where("matchId", "==", matchId)
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            const unique = [...new Set(data.map(item => item.fancyName))];
            res.send(unique)
        });
    },
    async getAllBets(req, res) {
        const userRef = db.collection('betDataMap')
            .where("settled", "!=", true);
        var arr = [];
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            for (var i = 0; i < data.length; i++) {
                if (!arr.some(e => e.fancyName === data[i].fancyName)) {
                    arr.push({ fancyName: data[i].fancyName, matchId: data[i].matchId })
                }
            }
            res.send(arr)
        })
    }
    ,
    async getLiveBets(req, res) {
        const { matchId } = req.params;
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('betDataMap')
            .where("matchId", "==", matchId)
            .where("userId", "==", username)
            .where("settled", "!=", true);
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    }
    ,
    roundOff(data) {
        const nRate = (
            Math.round((data / 100) * 100) / 100
        ).toFixed(2);
        return nRate;
    },
    async placeBet(req, res) {
        const username = req.user.email.split("@")[0];
        const { stake, isBack, isLay, priceValue, odds, fancyName, ipDetail, matchname, matchId, sportId, } = req.body;
        if (stake === undefined || isBack === undefined || isLay === undefined || priceValue === undefined || odds === undefined || fancyName === undefined || ipDetail === undefined || matchname === undefined || matchId === undefined || sportId === undefined) {
            return res.send({ msg: "Insufficient data recieved!" });
        }
        if (stake < 100) {
            return res.send({ msg: "The amount cannot be less than 100", status: 0 });
        }
        if (stake > 50000) {
            return res.send({ msg: "The amount cannot be greater than 50000", status: 0 });
        }
        const totalCoins = await CoinController.countCoin(username.toLowerCase());
        if (totalCoins < stake) {
            return res.send({ msg: "Insufficient Balance" });
        } else {
            const url = `http://172.105.35.224:3000/getbm2?eventId=${matchId}`
            const response = await axios.get(url);
            if (response.data) {
                if (response.data.t3) {
                    const currentData = response.data.t3.filter(x => x.nat === fancyName);
                    const filteredOdds = currentData.filter(x => (isBack && parseInt(x.b1) === parseInt(odds) || !isBack && parseInt(x.l1) === parseInt(odds)));
                    const filterValue = filteredOdds.filter(x => (isBack && priceValue === BetController.roundOff(x.bs1) || !isBack && priceValue === BetController.roundOff(x.ls1)))
                    if (filterValue.length) {
                        const amount = priceValue > 1 ? Math.round(stake * priceValue * 100) / 100 : stake;
                        const coinDb = db.collection('coinMap').doc(uuidv4());
                        const msg = `Bet placed of ${stake} coins on ${fancyName}`;
                        await coinDb.set({
                            value: parseInt(amount),
                            msg: msg,
                            setter: username.toLowerCase(),
                            createdOn: Date.now()
                        });
                        const betDb = db.collection('betDataMap').doc(uuidv4());
                        await betDb.set({
                            userId: username,
                            stake: stake,
                            isBack: isBack,
                            isLay: !isBack,
                            priceValue: priceValue,
                            odds: odds,
                            fancyName: fancyName,
                            ipDetail: ipDetail,
                            matchname: matchname,
                            matchId,
                            sportId,
                            settled: false,
                            createdOn: Date.now(),
                        });

                        res.send({ msg: "Bet Placed Successfully!", status: 1 })
                    } else {
                        res.send({ msg: "Session Changed.", status: 0 })
                    }
                }
            }
        }
    },


};

module.exports = BetController;
