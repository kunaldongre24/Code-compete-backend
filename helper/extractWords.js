function extractWords(str) {
  const words = str.toLowerCase().split(" ");
  let over = "";
  let teamName = "";

  for (let i = 0; i < words.length; i++) {
    if (
      words[i].toLowerCase() === "over" ||
      words[i].toLowerCase() === "overs"
    ) {
      over = words[i - 1];
    }
    if (words[i].toLowerCase() === "run" || words[i].toLowerCase() === "runs") {
      // Check for parentheses and get the word before it
      var nextWord = words[i + 1];
      for (var j = i + 2; j < words.length; j++) {
        nextWord = nextWord + " " + words[j];
      }
      const index = nextWord.indexOf("(");
      const index2 = nextWord.indexOf("adv");
      // If there's an opening parenthesis, extract the substring before it; otherwise, take the whole word
      teamName = index !== -1 ? nextWord.substring(0, index) : nextWord;
      teamName = index2 !== -1 ? nextWord.substring(0, index2) : nextWord;

      // If there is no space between "runs" and the team name, check the next word for parentheses
      if (teamName === "" && i + 2 < words.length) {
        const nextNextWord = words[i + 2];
        const nextIndex = nextNextWord.indexOf("(");
        teamName =
          nextIndex !== -1
            ? nextNextWord.substring(0, nextIndex)
            : nextNextWord;
      }
    }
  }

  return { over, teamName: teamName.trim() };
}
module.exports = extractWords;
