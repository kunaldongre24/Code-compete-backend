const { db } = require("../db");
const ListController = {
    async getSaList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username)
            .where("level", "==", 5);
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getSpList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username)
            .where("level", "==", 6)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getSsList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username)
            .where("level", "==", 4)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getScList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username)
            .where("level", "==", 2)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },

    async getMaList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username)
            .where("level", "==", 7)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getSstList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username)
            .where("level", "==", 3)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    }
    ,
    async getAllList(req, res) {
        const username = req.user.email.split("@")[0];
        const userRef = db.collection('users')
            .where("companyId", "==", username);
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
};

module.exports = ListController;
