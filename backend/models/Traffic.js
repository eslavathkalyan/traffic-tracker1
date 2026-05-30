const mongoose = require("mongoose");

const trafficSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true },
    congestionLevel: { type: String, enum: ["High", "Medium", "Low"], required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Traffic", trafficSchema);
