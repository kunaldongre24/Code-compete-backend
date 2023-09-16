const { config } = require("dotenv");
config();
const PORT = process.env.PORT || 8000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://kunal:X9%26vP%244R%23tZ7%40aQ1@139.59.0.68:27017/fly247";

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

module.exports = { JWT_SECRET, MONGODB_URI, PORT }; 
