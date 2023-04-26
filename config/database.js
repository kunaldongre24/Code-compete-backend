const mongoose = require("mongoose");
const { MONGODB_URI } = require("./config.js");

mongoose.set("strictQuery", false);
mongoose
  .connect(MONGODB_URI)
  .then((conn) => {
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  })
  .catch((error) => {
    console.error(error.message, error.stack);
  });
