const mongoose = require("mongoose");

const transportSchema = new mongoose.Schema(
  {
    lineName: { type: String, required: true },
    nextArrivalMinutes: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transport", transportSchema);
