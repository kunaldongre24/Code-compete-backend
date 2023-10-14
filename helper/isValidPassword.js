const isValidPassword = (password) => {
  // Add your validation logic here (e.g., check minimum length, complexity, etc.)
  return password.length >= 4; // Example: minimum length of 8 characters
};
module.exports = isValidPassword;
