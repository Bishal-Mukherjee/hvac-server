const mongoose = require("mongoose");
const { Status } = require("../constants");

const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: [
      Status.CREATED,
      Status.ASSIGNED,
      Status.IN_PROGRESS,
      Status.COMPLETED,
    ],
    default: Status.CREATED,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  activationDate: {
    type: Date,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    match: [/.+\@.+\..+/, "Please enter a valid email address"],
  },
  address: {
    type: {
      street: String,
      apartment: String,
      city: String,
      state: String,
      zip: String,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  images: {
    type: [String],
    default: [],
  },
  attachments: {
    type: [String],
    default: [],
  },
  suggestedBidders: {
    type: [String],
    default: [],
  },
  assignedTo: {
    type: {
      name: String,
      email: String,
    },
  },
});

module.exports = Task = mongoose.model("task", taskSchema);
