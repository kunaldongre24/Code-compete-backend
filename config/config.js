const { config } = require("dotenv");
config();
const PORT = process.env.PORT || 8000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://kunaldongre:Virat%4019@si.yxxtvtb.mongodb.net/fly247?retryWrites=true&w=majority";

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

module.exports = { JWT_SECRET, MONGODB_URI, PORT };
