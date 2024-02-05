function removeBrackets(input) {
  const cleanedString = input.replace(/[()]/g, ""); // Remove parentheses
  const result = parseFloat(cleanedString);
  return isNaN(result) ? null : result;
}
module.exports = removeBrackets;
