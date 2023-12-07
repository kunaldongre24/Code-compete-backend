const TeamIcon = require("../models/TeamIcon");

async function getTeamIcon(teamName) {
  try {
    const iconRow = await TeamIcon.findOne({
      teamName: teamName.toLowerCase(),
    }).exec();
    if (iconRow) {
      return iconRow.imageUrl;
    }
    return "";
  } catch (err) {
    console.log(err);
    return "";
  }
}
module.exports = getTeamIcon;
