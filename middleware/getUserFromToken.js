const admin = require("firebase-admin");

const getUserFromToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = getUserFromToken;
