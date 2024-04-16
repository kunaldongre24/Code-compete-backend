function generateAvatarUrl(username) {
  const hairStyles = [
    "long01",
    "long02",
    "long03",
    "long04",
    "long05",
    "long06",
    "long07",
    "long08",
    "long09",
    "long10",
    "long11",
    "long12",
    "long13",
    "long14",
    "long15",
    "long16",
    "long17",
    "long18",
    "long19",
    "long20",
    "long21",
    "short01",
    "short02",
    "short03",
    "short04",
    "short05",
    "short06",
    "short07",
    "short08",
    "short09",
    "short10",
    "short11",
    "short12",
    "short13",
    "short14",
    "short15",
    "short16",
    "short17",
    "short19",
    "short22",
    "short23",
    "short24",
  ];
  const selectedHairStyles = hairStyles.slice(0, 5).join(",");

  const mouthStyles = [
    "happy01",
    "happy02",
    "happy03",
    "happy04",
    "happy05",
    "happy06",
    "happy07",
    "happy08",
    "happy09",
    "happy10",
    "happy11",
    "happy12",
    "happy13",
  ];
  const selectedMouthStyles = mouthStyles.slice(0, 5).join(",");

  const mouthColors = ["c98276", "d29985", "transparent"];
  const selectedMouthColors = mouthColors.slice(0, 1).join(",");

  const hairColors = [
    "000000",
    "654321",
    "faebd7",
    "808080",
    "ffffff",
    "800080",
    "ffc0cb",
    "ffa500",
    "a52a2a",
    "654321",
    "d2b48c",
    "d2691e",
    "bc8f8f",
    "ffd700",
    "cd853f",
    "daa520",
    "b2beb5",
  ];
  const selectedHairColors = hairColors.slice(0, 1).join(",");

  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}&hair=${selectedHairStyles}&mouth=${selectedMouthStyles}&mouthColor=${selectedMouthColors}&accessories=&beardProbability=10&glassesProbability=1&hairColor=${selectedHairColors}&hatProbability=5`;
}
module.exports = generateAvatarUrl;
