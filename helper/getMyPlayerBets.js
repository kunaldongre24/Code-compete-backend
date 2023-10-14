const BetController = require("../controllers/BetController");
const apiSwitch = require("./apiSwitch");
const passport = require("passport");

// Function to get user information from a token
const getUserFromToken = (token) => {
  return new Promise((resolve, reject) => {
    passport.authenticate("jwt", { session: false }, (err, user) => {
      if (err || !user) {
        reject("Unauthorized"); // Reject with an error message
      } else {
        resolve(user); // Resolve with the user object
      }
    })({ headers: { authorization: `Bearer ${token}` } }); // Pass the token as a header
  });
};

const getMyPlayerBets = async (pData, socket) => {
  try {
    const userdata = await getUserFromToken(pData.token);
    const userId = userdata.username;
    const cData = await apiSwitch(pData.matchId);
    const data = await BetController.getMyPlayerBets(pData.matchId, userId);
    const betData = { odds: cData, betData: data };
    socket.emit("myPlayerBets", betData);
  } catch (error) {
    console.error(error);
    socket.emit("error", error); // Emit the error message received from getUserFromToken
  }
};

module.exports = getMyPlayerBets;
