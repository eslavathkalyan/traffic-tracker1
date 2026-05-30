const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const TrafficData = require("./models/TrafficData");

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "control-center-secret-key-998877";

app.use(cors());
app.use(express.json());

// Database connection
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/userssss";
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`Connected to MongoDB database instance: ${mongoose.connection.name}`);
    seedDefaultUser();
    seedInitialTraffic();
    startSimulator();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
  });

// Seed default administrator user
async function seedDefaultUser() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash("Operator123!", 10);
      await User.create({
        username: "System Operator",
        email: "operator@traffic.local",
        password: hashedPassword,
        role: "Control Center Operator"
      });
      console.log("Seeded default operator user: operator@traffic.local / Operator123!");
    }
  } catch (error) {
    console.error("Error seeding default user:", error);
  }
}

// Seed initial traffic data to avoid empty screen
async function seedInitialTraffic() {
  try {
    const dataCount = await TrafficData.countDocuments();
    if (dataCount === 0) {
      const initialRoutes = [
        { routeId: "R01", routeName: "Downtown Corridor", zone: "Downtown", activeVehicles: 52, congestionLevel: "Low", avgSpeed: 64, delayVariance: 2 },
        { routeId: "R02", routeName: "Highway 101", zone: "Suburban", activeVehicles: 110, congestionLevel: "Moderate", avgSpeed: 48, delayVariance: 6 },
        { routeId: "R03", routeName: "Metro Line Blue", zone: "Downtown", activeVehicles: 12, congestionLevel: "Low", avgSpeed: 75, delayVariance: 1 },
        { routeId: "R04", routeName: "Northside Bypass", zone: "Suburban", activeVehicles: 35, congestionLevel: "Low", avgSpeed: 58, delayVariance: 3 },
        { routeId: "R05", routeName: "Harbor Bridge Route", zone: "Waterfront", activeVehicles: 85, congestionLevel: "High", avgSpeed: 22, delayVariance: 18 }
      ];
      await TrafficData.insertMany(initialRoutes);
      console.log("Seeded initial traffic metrics data.");
    }
  } catch (error) {
    console.error("Error seeding initial traffic data:", error);
  }
}

// SIMULATOR CONFIGURATION STATE
let simulatorConfig = {
  peakMultiplier: 1.0,
  accidentalBlockages: [], // list of routeId strings
  incidentChance: 0.1,     // chance of a random incident per tick
  tickInterval: 4000       // dynamic loop interval (default 4 seconds)
};

let simulatorIntervalId = null;

// Route metadata for simulator
const routesMetadata = [
  { routeId: "R01", routeName: "Downtown Corridor", zone: "Downtown", baseVehicles: 50, baseSpeed: 70 },
  { routeId: "R02", routeName: "Highway 101", zone: "Suburban", baseVehicles: 110, baseSpeed: 95 },
  { routeId: "R03", routeName: "Metro Line Blue", zone: "Downtown", baseVehicles: 10, baseSpeed: 80 },
  { routeId: "R04", routeName: "Northside Bypass", zone: "Suburban", baseVehicles: 30, baseSpeed: 65 },
  { routeId: "R05", routeName: "Harbor Bridge Route", zone: "Waterfront", baseVehicles: 80, baseSpeed: 55 }
];

// SIMULATION TICK FUNCTION
async function runSimulationTick() {
  try {
    const tickData = [];

    for (const route of routesMetadata) {
      const isBlocked = simulatorConfig.accidentalBlockages.includes(route.routeId);
      const isIncident = !isBlocked && Math.random() < simulatorConfig.incidentChance;

      // Calculate vehicles (peak multiplier + noise)
      let activeVehicles = Math.round(
        route.baseVehicles * 
        simulatorConfig.peakMultiplier * 
        (0.85 + Math.random() * 0.3)
      );
      if (route.routeId === "R03") {
        // Metro is fixed-schedule, so vehicles count varies very slightly
        activeVehicles = Math.round(route.baseVehicles * (0.9 + Math.random() * 0.2));
      }

      let avgSpeed;
      let congestionLevel;
      let delayVariance;

      if (isBlocked) {
        avgSpeed = Math.round(5 + Math.random() * 8); // extremely slow
        congestionLevel = "High";
        delayVariance = Math.round(18 + Math.random() * 22); // 18-40 min delay
      } else if (isIncident) {
        avgSpeed = Math.round(route.baseSpeed * 0.3 * (0.8 + Math.random() * 0.4));
        congestionLevel = "High";
        delayVariance = Math.round(10 + Math.random() * 12);
      } else {
        // Normal traffic density impact on speed
        const loadFactor = activeVehicles / (route.baseVehicles * 2.2);
        const speedMultiplier = Math.max(0.2, 1.0 - loadFactor);
        avgSpeed = Math.round(route.baseSpeed * speedMultiplier * (0.9 + Math.random() * 0.2));

        if (avgSpeed < route.baseSpeed * 0.4) {
          congestionLevel = "High";
        } else if (avgSpeed < route.baseSpeed * 0.75) {
          congestionLevel = "Moderate";
        } else {
          congestionLevel = "Low";
        }

        // Calculate delays based on congestion
        if (congestionLevel === "Low") {
          delayVariance = Math.max(0, Math.round(Math.random() * 2));
        } else if (congestionLevel === "Moderate") {
          delayVariance = Math.round(2 + Math.random() * 5);
        } else {
          delayVariance = Math.round(7 + Math.random() * 10);
        }
      }

      tickData.push({
        routeId: route.routeId,
        routeName: route.routeName,
        zone: route.zone,
        activeVehicles,
        congestionLevel,
        avgSpeed,
        delayVariance
      });
    }

    // Save batch records to database
    await TrafficData.insertMany(tickData);

    // Prune storage hygiene limit: keep latest 100 records
    const totalCount = await TrafficData.countDocuments();
    if (totalCount > 100) {
      const excess = totalCount - 100;
      const oldestDocs = await TrafficData.find()
        .sort({ createdAt: 1 })
        .limit(excess)
        .select("_id");
      const idsToDelete = oldestDocs.map((doc) => doc._id);
      await TrafficData.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (error) {
    console.error("Error executing simulator tick:", error);
  }
}

// Start Simulator
function startSimulator() {
  if (simulatorIntervalId) {
    clearInterval(simulatorIntervalId);
  }
  simulatorIntervalId = setInterval(runSimulationTick, simulatorConfig.tickInterval);
  console.log(`Live Simulator Loop active. Ticking every ${simulatorConfig.tickInterval}ms`);
}

// AUTHENTICATION MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Access denied. Token missing." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
}

// --- API ENDPOINTS ---

// 1. User Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 2. User Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Create Token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 3. User Profile Info
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 4. Live Traffic Status
app.get("/api/traffic-status", async (req, res) => {
  try {
    // Get the latest single record for each routeId
    const latestMetrics = await TrafficData.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$routeId",
          latestDoc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestDoc" } },
      { $sort: { routeId: 1 } }
    ]);

    // Also get the history for timelines/graphs (latest 100 entries sorted newest first)
    const history = await TrafficData.find().sort({ createdAt: -1 }).limit(60);

    res.json({
      success: true,
      data: latestMetrics,
      history,
      simulatorConfig
    });
  } catch (error) {
    console.error("Error fetching traffic status:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 5. Compute and Rank Travel Routes (Optimization Engine)
app.get("/api/routes/optimize", async (req, res) => {
  try {
    // Gather latest records of each route
    const latestMetrics = await TrafficData.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$routeId",
          latestDoc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestDoc" } }
    ]);

    if (latestMetrics.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Weight formulas:
    // Speed contribution (0-50 pts): (avgSpeed / 100) * 50
    // Delay variance contribution (0-50 pts): Math.max(0, 30 - delayVariance) / 30 * 50
    const optimized = latestMetrics.map((route) => {
      const speedScore = (Math.min(route.avgSpeed, 100) / 100) * 50;
      const delayScore = (Math.max(0, 30 - route.delayVariance) / 30) * 50;
      const score = Math.round((speedScore + delayScore) * 10) / 10;

      return {
        routeId: route.routeId,
        routeName: route.routeName,
        zone: route.zone,
        activeVehicles: route.activeVehicles,
        congestionLevel: route.congestionLevel,
        avgSpeed: route.avgSpeed,
        delayVariance: route.delayVariance,
        score
      };
    });

    // Rank routes by score descending
    optimized.sort((a, b) => b.score - a.score);

    const ranked = optimized.map((route, idx) => {
      let recommendation = "Low Priority Option: Substantial delay variance or congestion.";
      if (idx === 0) {
        recommendation = "Highly Recommended: Optimal flow rate and minimal transit delay.";
      } else if (idx === 1) {
        recommendation = "Secondary Option: Managed congestion levels, acceptable backup route.";
      }

      return {
        rank: idx + 1,
        ...route,
        recommendation
      };
    });

    res.json({
      success: true,
      data: ranked
    });
  } catch (error) {
    console.error("Optimization pipeline error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 6. Mutate Simulator Variables
app.post("/api/admin/config", async (req, res) => {
  try {
    const { peakMultiplier, accidentalBlockages, incidentChance, tickInterval } = req.body;

    if (peakMultiplier !== undefined) {
      const val = parseFloat(peakMultiplier);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ success: false, message: "Peak traffic multiplier must be a positive number." });
      }
      simulatorConfig.peakMultiplier = val;
    }

    if (accidentalBlockages !== undefined) {
      if (!Array.isArray(accidentalBlockages)) {
        return res.status(400).json({ success: false, message: "Accidental blockages must be an array of route IDs." });
      }
      simulatorConfig.accidentalBlockages = accidentalBlockages;
    }

    if (incidentChance !== undefined) {
      const val = parseFloat(incidentChance);
      if (isNaN(val) || val < 0 || val > 1) {
        return res.status(400).json({ success: false, message: "Incident chance must be a value between 0 and 1." });
      }
      simulatorConfig.incidentChance = val;
    }

    if (tickInterval !== undefined) {
      const val = parseInt(tickInterval, 10);
      if (isNaN(val) || val < 1000 || val > 30000) {
        return res.status(400).json({ success: false, message: "Interval tick must be between 1000ms and 30000ms." });
      }
      simulatorConfig.tickInterval = val;
      // Restart loop with new interval timing
      startSimulator();
    }

    res.json({
      success: true,
      message: "Simulator configuration mutated successfully.",
      config: simulatorConfig
    });
  } catch (error) {
    console.error("Admin configuration error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 7. Health Check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "MERN Operational Engine API is active.", database: mongoose.connection.name });
});

// Start listening
app.listen(port, () => {
  console.log(`Operational control backend server active on port ${port}`);
});
