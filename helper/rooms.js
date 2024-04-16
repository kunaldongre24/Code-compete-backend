const Room = require("../models/Room");
const updateTpp = async (roomId, val, adminId) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return {};
    }

    if (room.admin.toString() !== adminId.toString()) {
      return {};
    }

    const updatedRoom = await Room.findOneAndUpdate(
      { roomId },
      { tpp: val },
      { new: true }
    );
    return updatedRoom;
  } catch (error) {
    console.error(error);
    return {};
  }
};

const updateRounds = async (roomId, val, adminId) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return {};
    }

    if (room.admin.toString() !== adminId.toString()) {
      return {};
    }

    const updatedRoom = await Room.findOneAndUpdate(
      { roomId },
      { rounds: val },
      { new: true }
    );
    return updatedRoom;
  } catch (error) {
    console.error(error);
    return {};
  }
};

const updateMinRating = async (roomId, val, adminId) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return {};
    }

    if (room.admin.toString() !== adminId.toString()) {
      return {};
    }

    const updatedRoom = await Room.findOneAndUpdate(
      { roomId },
      { minRating: val },
      { new: true }
    );
    return updatedRoom;
  } catch (error) {
    console.error(error);
    return {};
  }
};

const updateMaxRating = async (roomId, val, adminId) => {
  try {
    const room = await Room.findOne({ roomId });
    if (!room) {
      return {};
    }

    if (room.admin.toString() !== adminId.toString()) {
      return {};
    }

    const updatedRoom = await Room.findOneAndUpdate(
      { roomId },
      { maxRating: val },
      { new: true }
    );
    return updatedRoom;
  } catch (error) {
    console.error(error);
    return {};
  }
};

const getRoom = async (roomId) => {
  try {
    const room = await Room.findOne({ roomId });
    return room;
  } catch (error) {
    console.error(error);
    return {};
  }
};
module.exports = {
  updateTpp,
  updateRounds,
  updateMinRating,
  updateMaxRating,
  getRoom,
};
