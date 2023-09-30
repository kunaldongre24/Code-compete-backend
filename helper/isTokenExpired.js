const jwt = require("jsonwebtoken");

// Define the function to check if a JWT has expired
function isTokenExpired(token) {
  try {
    // Verify the token without validating the signature
    const decoded = jwt.decode(token, { complete: true });

    // Check if the expiration time (exp) exists and is in the future
    if (
      decoded &&
      decoded.payload.exp &&
      decoded.payload.exp > Date.now() / 1000
    ) {
      return false; // Token is not expired
    }

    return true; // Token is expired
  } catch (error) {
    return true; // An error occurred while decoding the token (assume it's expired)
  }
}

module.exports = isTokenExpired;
