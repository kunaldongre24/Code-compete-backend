const RaceUserProblemsetMap = require("../models/RaceUserProblemsetMap");

function ResolveIntervalRaces(io) {
  const updateFinishedField = async () => {
    const currentTime = new Date();
    const expiryTime = new Date(
      currentTime.getTime() - process.env.TIME_PER_PROBLEM * 60000
    );
    const docsToUpdate = await RaceUserProblemsetMap.find({
      startingTime: { $lte: expiryTime },
      finished: false,
    });

    for (const doc of docsToUpdate) {
      await RaceUserProblemsetMap.findByIdAndUpdate(doc._id, {
        finished: true,
      });

      io.to(doc.raceId.toString()).emit("problemFinished");
    }
  };

  // Run the update every second
  setInterval(updateFinishedField, 1000);
}

module.exports = ResolveIntervalRaces;
