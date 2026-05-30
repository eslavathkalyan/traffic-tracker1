const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/traffic_dashboard";
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

module.exports = connectDatabase;
