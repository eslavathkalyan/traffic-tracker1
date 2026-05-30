const express = require("express");
const cors = require("cors");
const connectDatabase = require("./db");
const seedDataIfEmpty = require("./seedData");
const Traffic = require("../models/Traffic");
const Transport = require("../models/Transport");

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/traffic", async (req, res) => {
  const traffic = await Traffic.find({}, { _id: 0, routeName: 1, congestionLevel: 1 });
  res.json({
    success: true,
    data: traffic
  });
});

app.get("/transport", async (req, res) => {
  const transport = await Transport.find({}, { _id: 0, lineName: 1, nextArrivalMinutes: 1 });
  res.json({
    success: true,
    data: transport
  });
});

app.get("/best-route", async (req, res) => {
  const traffic = await Traffic.find({}, { _id: 0, routeName: 1, congestionLevel: 1 });
  const highTrafficRoute = traffic.find((route) => route.congestionLevel === "High");
  const lowTrafficRoute = traffic.find((route) => route.congestionLevel === "Low");

  if (highTrafficRoute && lowTrafficRoute) {
    return res.json({
      success: true,
      data: {
        suggestedRoute: lowTrafficRoute.routeName,
        reason: `${highTrafficRoute.routeName} has high congestion. Use ${lowTrafficRoute.routeName} instead.`
      }
    });
  }

  return res.json({
    success: true,
    data: {
      suggestedRoute: traffic[0]?.routeName || "No route available",
      reason: "Traffic is manageable. Continue on normal route."
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

async function startServer() {
  try {
    await connectDatabase();
    await seedDataIfEmpty();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
