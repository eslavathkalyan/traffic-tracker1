const mongoose = require("mongoose");

const trafficDataSchema = new mongoose.Schema(
  {
    routeId: { type: String, required: true },
    routeName: { type: String, required: true },
    zone: { type: String, required: true }, // e.g., "Downtown", "Suburban", "Waterfront"
    activeVehicles: { type: Number, required: true },
    congestionLevel: { type: String, enum: ["Low", "Moderate", "High"], required: true },
    avgSpeed: { type: Number, required: true }, // in km/h
    delayVariance: { type: Number, required: true } // in minutes
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrafficData", trafficDataSchema);
