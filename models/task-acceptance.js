const mongoose = require("mongoose");
const { Status } = require("../constants");

const taskAcceptanceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
  },
  taskId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [Status.ACCEPTED, Status.REJECTED],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = TaskAcceptance = mongoose.model(
  "taskAcceptance",
  taskAcceptanceSchema
);
