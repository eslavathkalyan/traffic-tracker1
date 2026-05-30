const Traffic = require("../models/Traffic");
const Transport = require("../models/Transport");

const trafficSeed = [
  { routeName: "Route A", congestionLevel: "High" },
  { routeName: "Route B", congestionLevel: "Medium" },
  { routeName: "Route C", congestionLevel: "Low" }
];

const transportSeed = [
  { lineName: "Bus 101", nextArrivalMinutes: 6 },
  { lineName: "Metro Blue", nextArrivalMinutes: 3 },
  { lineName: "Bus 202", nextArrivalMinutes: 9 }
];

async function seedDataIfEmpty() {
  const trafficCount = await Traffic.countDocuments();
  const transportCount = await Transport.countDocuments();

  if (trafficCount === 0) {
    await Traffic.insertMany(trafficSeed);
  }

  if (transportCount === 0) {
    await Transport.insertMany(transportSeed);
  }
}

module.exports = seedDataIfEmpty;
