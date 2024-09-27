const mongoose = require("mongoose");
const { Status, Quality, CURRENCY } = require("../constants");

const bidSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  taskId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  attachment: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: CURRENCY,
  },
  quality: {
    type: String,
    enum: [Quality.GOOD, Quality.BETTER, Quality.BEST],
    default: Quality.GOOD,
  },
  estimatedCompletionDays: {
    type: Number,
    required: true,
    min: 0,
  },
  bidder: {
    type: {
      name: { type: String },
      email: { type: String },
      logo: { type: String },
    },
  },
  status: {
    type: String,
    enum: [Status.PENDING, Status.ACCEPTED, Status.REJECTED],
    default: Status.PENDING,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Bid = mongoose.model("bid", bidSchema);
