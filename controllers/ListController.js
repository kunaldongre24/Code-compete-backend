const { db } = require("../db");
const ListController = {
    async getSaList(req, res) {
        const { username } = req.params;
        const userRef = db.collection('users')
            .where("companyId", "==", username.toUpperCase())
            .where("level", "==", 5);
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getSpList(req, res) {
        const { username } = req.params;
        const userRef = db.collection('users')
            .where("companyId", "==", username.toUpperCase())
            .where("level", "==", 6)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getSsList(req, res) {
        const { username } = req.params;
        const userRef = db.collection('users')
            .where("companyId", "==", username.toUpperCase())
            .where("level", "==", 4)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getScList(req, res) {
        const { username } = req.params;
        const userRef = db.collection('users')
            .where("companyId", "==", username.toUpperCase())
            .where("level", "==", 2)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
    async getSstList(req, res) {
        const { username } = req.params;
        const userRef = db.collection('users')
            .where("companyId", "==", username.toUpperCase())
            .where("level", "==", 3)
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    }
    ,
    async getAllList(req, res) {
        const { username } = req.params;
        const userRef = db.collection('users')
            .where("companyId", "==", username.toUpperCase())
            ;
        userRef.get().then(value => {
            const data = value.docs.map(doc => doc.data());
            res.send(data);
        })
    },
};

module.exports = ListController;
