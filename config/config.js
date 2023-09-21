const { config } = require("dotenv");
config();
const PORT = process.env.PORT || 8000;
const MONGODB_URI =
  process.env.MONGO_DB_CONNECTION_STRING;

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = { JWT_SECRET, MONGODB_URI, PORT }; 
