function shortForm(str) {
  const words = str.split(" ");
  const abbreviation = words.map((word) => word[0]).join("");
  return abbreviation.toLowerCase();
}

module.exports = shortForm;
