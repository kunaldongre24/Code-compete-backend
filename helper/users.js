const Room = require("../models/Room");
const RoomUserMap = require("../models/RoomUserMap");

const addUser = async (id, userId, roomId) => {
  try {
    if (!userId) return { error: "Username is required" };
    if (!roomId) return { error: "Room is required" };

    const room = await Room.findOne({ roomId });
    if (!room) {
      console.log("Room not found");
      return { error: "Room not found" };
    }
    const map = await RoomUserMap.findOne({ roomId: room._id, userId });
    if (map) {
      await RoomUserMap.deleteMany({ userId });
      console.log("Room user map already exits!");
    }
    const newRoom = new RoomUserMap({
      userId,
      isAdmin: room.admin == userId,
      roomId: room._id,
      socketId: id,
    });
    await newRoom.save();
    const user = await getUser(id);
    return { user };
  } catch (err) {
    console.error(err);
    return [];
  }
};
const getUserById = async (id) => {
  try {
    const user = await RoomUserMap.findOne({ userId: id })
      .sort({ createdOn: -1 })
      .populate(
        "userId",
        "-hash -salt -currentSession -authStrategy -verified -createdOn -role"
      );
    return user;
  } catch (err) {
    console.error(err);
    return;
  }
};
const getUser = async (id) => {
  try {
    const user = await RoomUserMap.findOne({ socketId: id }).populate(
      "userId",
      "-hash -salt -currentSession -authStrategy -verified -createdOn -role -refreshToken"
    );
    return user;
  } catch (err) {
    console.error(err);
    return;
  }
};
const updateStatus = async (id, status) => {
  try {
    const isReady = status ? true : false;
    const roomUserMap = await RoomUserMap.findOneAndUpdate(
      { socketId: id },
      { isReady },
      { new: true }
    );
    if (!roomUserMap) {
      return [];
    }
    const users = await getUsers(roomUserMap.roomId);
    return users;
  } catch (err) {
    console.error(err);
    return [];
  }
};
const updateSpectate = async (id, status) => {
  try {
    const isSpectator = status ? true : false;
    const roomUserMap = await RoomUserMap.findOneAndUpdate(
      { socketId: id },
      { isSpectator },
      { new: true }
    );
    if (!roomUserMap) {
      return [];
    }
    const users = await getUsers(roomUserMap.roomId);
    return users;
  } catch (err) {
    console.error(err);
    return [];
  }
};
const handleMute = async (userId, status, adminId) => {
  try {
    const isMuted = status ? true : false;
    const roomUserMap = await RoomUserMap.findOne({ userId }).sort({
      createdOn: -1,
    });
    if (!roomUserMap) {
      return {};
    }

    const { roomId } = roomUserMap;

    const room = await Room.findOne({ _id: roomId });
    if (!room) {
      return {};
    }

    if (room.admin.toString() !== adminId.toString()) {
      console.log(
        room.admin.toString(),
        adminId.toString(),
        room.admin.toString() === adminId.toString()
      );
      console.log("Unauthorized");
      return {};
    }

    const updatedRoomUserMap = await RoomUserMap.findOneAndUpdate(
      { userId },
      { isMuted },
      { new: true }
    );
    if (!updatedRoomUserMap) {
      return {};
    }

    return updatedRoomUserMap;
  } catch (err) {
    console.error(err);
    return {};
  }
};

const handleKickUser = async (id, adminId) => {
  try {
    const roomUserMap = await RoomUserMap.findOne({ userId: id }).sort({
      createdOn: -1,
    });
    if (!roomUserMap) {
      return [];
    }

    const { roomId } = roomUserMap;

    const room = await Room.findOne({ _id: roomId });
    if (!room) {
      return [];
    }

    if (room.admin.toString() !== adminId.toString()) {
      return [];
    }

    const deletedUser = await RoomUserMap.findOneAndDelete({
      userId: id,
    }).populate(
      "userId",
      "-hash -salt -currentSession -authStrategy -verified -createdOn -role"
    );

    return deletedUser;
  } catch (err) {
    console.log(err);
    return [];
  }
};

const deleteUser = async (id) => {
  try {
    const deletedUser = await RoomUserMap.findOneAndDelete({
      socketId: id,
    }).populate(
      "userId",
      "-hash -salt -currentSession -authStrategy -verified -createdOn -role"
    );

    return deletedUser;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const getUsers = async (room) => {
  const users = await RoomUserMap.find({ roomId: room }).populate(
    "userId",
    "-hash -salt -currentSession -authStrategy -verified -createdOn -role"
  );
  return users;
};

module.exports = {
  handleMute,
  handleKickUser,
  updateStatus,
  addUser,
  getUser,
  getUserById,
  updateSpectate,
  deleteUser,
  getUsers,
};
