import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// API Base URL helper (falls back to local relative paths proxied by Vite/Nginx)
const API_URL = ""; 

const routesMetadata = [
  { routeId: "R01", routeName: "Downtown Corridor", baseVehicles: 50, baseSpeed: 70 },
  { routeId: "R02", routeName: "Highway 101", baseVehicles: 110, baseSpeed: 95 },
  { routeId: "R03", routeName: "Metro Line Blue", baseVehicles: 10, baseSpeed: 80 },
  { routeId: "R04", routeName: "Northside Bypass", baseVehicles: 30, baseSpeed: 65 },
  { routeId: "R05", routeName: "Harbor Bridge Route", baseVehicles: 80, baseSpeed: 55 }
];

function App() {
  // Auth State
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null
  );

  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authErrors, setAuthErrors] = useState({});
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  const [authErrorMsg, setAuthErrorMsg] = useState("");

  // Navigation State
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, admin, profile

  // Traffic Data State
  const [trafficData, setTrafficData] = useState([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [simConfig, setSimConfig] = useState({
    peakMultiplier: 1.0,
    accidentalBlockages: [],
    incidentChance: 0.1,
    tickInterval: 4000
  });

  // Admin Config Form State
  const [peakMultiplier, setPeakMultiplier] = useState(1.0);
  const [incidentChance, setIncidentChance] = useState(0.1);
  const [tickInterval, setTickInterval] = useState(4000);
  const [blockages, setBlockages] = useState([]);
  const [adminNotification, setAdminNotification] = useState("");

  // Dashboard location sector filter
  const [selectedZone, setSelectedZone] = useState("All");

  // System status flags
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");

  // Session timer state (duration since login)
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const loginTimeRef = useRef(Date.now());

  // Email validation helper
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 1. Authenticate Submit Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthErrors({});
    setAuthErrorMsg("");
    setAuthSuccessMsg("");

    const errors = {};
    if (isRegister && !usernameInput.trim()) {
      errors.username = "Username is required.";
    }
    if (!emailInput.trim()) {
      errors.email = "Email is required.";
    } else if (!validateEmail(emailInput)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!passwordInput) {
      errors.password = "Password is required.";
    } else if (passwordInput.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setAuthErrors(errors);
      return;
    }

    try {
      if (isRegister) {
        // Register Action
        const response = await axios.post(`${API_URL}/api/auth/register`, {
          username: usernameInput,
          email: emailInput,
          password: passwordInput
        });
        if (response.data.success) {
          setAuthSuccessMsg("Registration successful! You can now log in.");
          setIsRegister(false);
          setUsernameInput("");
          setPasswordInput("");
        }
      } else {
        // Login Action
        const response = await axios.post(`${API_URL}/api/auth/login`, {
          email: emailInput,
          password: passwordInput
        });
        if (response.data.success) {
          const { token, user: loggedUser } = response.data;
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(loggedUser));
          setToken(token);
          setUser(loggedUser);
          loginTimeRef.current = Date.now();
          setSessionSeconds(0);
          setEmailInput("");
          setPasswordInput("");
        }
      }
    } catch (err) {
      console.error(err);
      setAuthErrorMsg(err.response?.data?.message || "Authentication failed. Try again.");
    }
  };

  // 2. Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setActiveTab("dashboard");
    setTrafficData([]);
    setOptimizedRoutes([]);
  };

  // 3. Admin Configuration Mutate Handler
  const handleAdminConfigSubmit = async (e) => {
    e.preventDefault();
    setAdminNotification("");
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/config`,
        {
          peakMultiplier: parseFloat(peakMultiplier),
          accidentalBlockages: blockages,
          incidentChance: parseFloat(incidentChance),
          tickInterval: parseInt(tickInterval)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setAdminNotification("Simulator configuration updated successfully!");
        setSimConfig(response.data.config);
        setTimeout(() => setAdminNotification(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setAdminNotification(err.response?.data?.message || "Failed to update configuration.");
    }
  };

  // 4. State Sync Engine (Self-Healing Loop)
  const fetchData = async () => {
    if (!token) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      const [statusRes, optimizeRes] = await Promise.all([
        axios.get(`${API_URL}/api/traffic-status`),
        axios.get(`${API_URL}/api/routes/optimize`)
      ]);

      if (statusRes.data.success) {
        setTrafficData(statusRes.data.data);
        setHistoryData(statusRes.data.history);
        setSimConfig(statusRes.data.simulatorConfig);
      }

      if (optimizeRes.data.success) {
        setOptimizedRoutes(optimizeRes.data.data);
      }

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Sync error:", error);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger sync on login or interval update
  useEffect(() => {
    if (!token) return;
    fetchData();

    // Dynamically match sync interval to simulator tick rate
    const intervalTime = simConfig.tickInterval || 4000;
    const syncInterval = setInterval(fetchData, intervalTime);

    return () => clearInterval(syncInterval);
  }, [token, simConfig.tickInterval]);

  // Handle syncing admin control settings to local states initially
  useEffect(() => {
    if (simConfig) {
      setPeakMultiplier(simConfig.peakMultiplier);
      setIncidentChance(simConfig.incidentChance);
      setTickInterval(simConfig.tickInterval);
      setBlockages(simConfig.accidentalBlockages || []);
    }
  }, [simConfig]);

  // Session duration timer
  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - loginTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [token]);

  // Format session time
  const formatSessionTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0")
    ].join(":");
  };

  // Helper toggle for blockage checkboxes
  const handleBlockageToggle = (routeId) => {
    if (blockages.includes(routeId)) {
      setBlockages(blockages.filter((id) => id !== routeId));
    } else {
      setBlockages([...blockages, routeId]);
    }
  };

  // Helper color indicators for congestion levels
  const getCongestionStyles = (level) => {
    switch (level) {
      case "Low":
        return {
          color: "var(--color-emerald)",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          shadow: "0 0 15px rgba(16, 185, 129, 0.15)"
        };
      case "Moderate":
        return {
          color: "var(--color-amber)",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.35)",
          shadow: "0 0 15px rgba(245, 158, 11, 0.15)"
        };
      case "High":
        return {
          color: "var(--color-crimson)",
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.35)",
          shadow: "0 0 15px rgba(239, 68, 68, 0.15)"
        };
      default:
        return {
          color: "#94a3b8",
          bg: "rgba(148, 163, 184, 0.1)",
          border: "rgba(148, 163, 184, 0.2)",
          shadow: "none"
        };
    }
  };

  const filteredTraffic = selectedZone === "All" ? trafficData : trafficData.filter(route => route.zone === selectedZone);
  const filteredOptimized = selectedZone === "All" ? optimizedRoutes : optimizedRoutes.filter(route => route.zone === selectedZone);

  // RENDER APP
  return (
    <div className="app-shell route-dashboard">
      {!token ? (
        /* LOGIN / REGISTRATION COMPONENT */
        <div className="auth-wrapper">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-brand-logo">T-FLOW</div>
              <h2>Traffic Control Operations</h2>
              <p>Sign in to access real-time optimization dashboards</p>
            </div>

            {authSuccessMsg && <div className="alert success">{authSuccessMsg}</div>}
            {authErrorMsg && <div className="alert error">{authErrorMsg}</div>}

            <form onSubmit={handleAuthSubmit} className="auth-form" noValidate>
              {isRegister && (
                <div className="form-group">
                  <label htmlFor="username">Full Name / Operator Username</label>
                  <input
                    type="text"
                    id="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. Officer Smith"
                    className={authErrors.username ? "input-error" : ""}
                  />
                  {authErrors.username && <span className="field-error">{authErrors.username}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Operator Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="operator@traffic.local"
                  className={authErrors.email ? "input-error" : ""}
                />
                {authErrors.email && <span className="field-error">{authErrors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Security Password</label>
                <input
                  type="password"
                  id="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className={authErrors.password ? "input-error" : ""}
                />
                {authErrors.password && <span className="field-error">{authErrors.password}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                {isRegister ? "Create Operations Account" : "Access Console"}
              </button>
            </form>

            <div className="auth-footer">
              {isRegister ? (
                <p>
                  Already registered?{" "}
                  <button onClick={() => setIsRegister(false)} className="btn-link">
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  New control operator?{" "}
                  <button onClick={() => setIsRegister(true)} className="btn-link">
                    Request Account
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MAIN OPERATIONAL CONSOLE (AUTHENTICATED) */
        <div className="console-layout">
          {/* SIDEBAR NAVIGATION */}
          <aside className="console-sidebar">
            <div className="sidebar-brand">
              <div className="brand-badge">TF</div>
              <div className="brand-info">
                <span className="brand-title">T-FLOW</span>
                <span className="brand-subtitle">Transit Optimizer</span>
              </div>
              <div className="live-dot-wrap">
                <span className="live-dot"></span>
                <span className="live-text">LIVE</span>
              </div>
            </div>

            <div className="operator-chip">
              <div className="operator-avatar">OP</div>
              <div className="operator-details">
                <div className="operator-name">{user?.username || "Operator"}</div>
                <div className="operator-role">{user?.role || "Control Center Operator"}</div>
              </div>
            </div>

            <nav className="sidebar-nav">
              <button
                className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                Operations Dashboard
              </button>

              <button
                className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Simulator Variables
              </button>

              <button
                className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                User Profile
              </button>
            </nav>

            <div className="sidebar-footer">
              <button onClick={handleLogout} className="btn-logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log Out Operator
              </button>
            </div>
          </aside>

          {/* MAIN DISPLAY AREA */}
          <main className="console-main">
            {/* TOP HEADER BAR */}
            <header className="console-header">
              <div className="header-meta">
                <h1>
                  {activeTab === "dashboard" && "Operational Dashboard"}
                  {activeTab === "admin" && "Simulator Control Center"}
                  {activeTab === "profile" && "Operator Profile"}
                </h1>
                <p className="header-sub">
                  MERN Real-Time Traffic & Transport Infrastructure Optimization
                </p>
              </div>

              <div className="header-sync-status">
                {syncError ? (
                  <span className="sync-badge error">Sync Failure</span>
                ) : isSyncing ? (
                  <span className="sync-badge loading">Syncing Metrics...</span>
                ) : (
                  <span className="sync-badge synced">Synced: {lastSyncTime || "N/A"}</span>
                )}
                <button onClick={fetchData} className="btn-refresh" title="Force Refresh">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </div>
            </header>

            {/* VIEWS SHELL */}
            <div className="console-view-content">
              {activeTab === "dashboard" && (
                /* VIEW: DASHBOARD */
                <div className="dashboard-view-wrapper">
                  {/* ZONE / LOCATION SELECTOR TOOLBAR */}
                  <div className="zone-filter-bar">
                    <span className="filter-label">Sector Zone Coverage:</span>
                    <div className="filter-pills">
                      {["All", "Downtown", "Suburban", "Waterfront"].map((zone) => (
                        <button
                          key={zone}
                          className={`filter-pill ${selectedZone === zone ? "active" : ""}`}
                          onClick={() => setSelectedZone(zone)}
                        >
                          {zone} {zone !== "All" && `(${trafficData.filter(r => r.zone === zone).length})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RECOMMENDED OPTIMAL ROUTE BANNER */}
                  {filteredOptimized.length > 0 && (
                    <div className="recommendation-banner-glow">
                      <div className="recommendation-banner">
                        <div className="banner-badge">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          SYSTEM ROUTE RECOMMENDATION
                        </div>
                        <div className="banner-content">
                          <div className="banner-main-info">
                            <h2>
                              Use {filteredOptimized[0].routeName} (Route {filteredOptimized[0].routeId})
                            </h2>
                            <p className="banner-desc">{filteredOptimized[0].recommendation}</p>
                          </div>
                          <div className="banner-metrics">
                            <div className="banner-metric">
                              <span className="metric-label">Avg Speed</span>
                              <span className="metric-value font-emerald">
                                {filteredOptimized[0].avgSpeed} km/h
                              </span>
                            </div>
                            <div className="banner-metric">
                              <span className="metric-label">Schedule Variance</span>
                              <span className="metric-value">
                                {filteredOptimized[0].delayVariance}m delay
                              </span>
                            </div>
                            <div className="banner-score">
                              <span className="score-label">Efficiency Score</span>
                              <span className="score-value">{filteredOptimized[0].score}/100</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REAL-TIME CARDS GRID */}
                  <section className="metrics-grid">
                    {filteredTraffic.length === 0 ? (
                      <div className="loading-card">
                        <p>No active telemetry for the selected sector zone.</p>
                      </div>
                    ) : (
                      filteredTraffic.map((route) => {
                        const style = getCongestionStyles(route.congestionLevel);
                        const isBlocked = simConfig.accidentalBlockages?.includes(route.routeId);

                        // Percent delays (30 max)
                        const delayPercent = Math.min((route.delayVariance / 30) * 100, 100);

                        return (
                          <div
                            key={route.routeId}
                            className="route-card-glow"
                            style={{ "--glow-color": style.border, boxShadow: style.shadow }}
                          >
                            <div className="route-card">
                              <div className="card-header">
                                <div>
                                  <span className="route-id-badge">ID: {route.routeId}</span>
                                  <h3>{route.routeName}</h3>
                                </div>
                                <span
                                  className="congestion-badge"
                                  style={{ color: style.color, backgroundColor: style.bg, borderColor: style.border }}
                                >
                                  <span className="pulse-indicator" style={{ backgroundColor: style.color }}></span>
                                  {isBlocked ? "Blocked" : route.congestionLevel}
                                </span>
                              </div>

                              <div className="card-body">
                                <div className="card-stats">
                                  <div className="card-stat">
                                    <span className="stat-label">Average Speed</span>
                                    <span className="stat-num">{route.avgSpeed} <span className="stat-unit">km/h</span></span>
                                  </div>
                                  <div className="card-stat">
                                    <span className="stat-label">Active Vehicles</span>
                                    <span className="stat-num">{route.activeVehicles}</span>
                                  </div>
                                </div>

                                <div className="card-progress">
                                  <div className="progress-labels">
                                    <span>Schedule Delay Variance</span>
                                    <span className={route.delayVariance > 10 ? "font-crimson" : ""}>
                                      {route.delayVariance} mins
                                    </span>
                                  </div>
                                  <div className="progress-bar-bg">
                                    <div
                                      className="progress-bar-fill"
                                      style={{
                                        width: `${delayPercent}%`,
                                        backgroundColor: style.color
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </section>

                  {/* TABULAR DATA METRICS ARRAY */}
                  <section className="tabular-metrics-section">
                    <div className="section-title-wrap">
                      <h2>System Telemetry Matrix</h2>
                      <p>Tabular overview of active transit pathways ranked by priority weights</p>
                    </div>

                    <div className="table-wrapper">
                      <table className="telemetry-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Route Name</th>
                            <th>ID</th>
                            <th>Congestion</th>
                            <th>Avg Speed</th>
                            <th>Delay Variance</th>
                            <th>Active Vehicles</th>
                            <th>Efficiency Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOptimized.map((route) => {
                            const styles = getCongestionStyles(route.congestionLevel);
                            const isBlocked = simConfig.accidentalBlockages?.includes(route.routeId);

                            return (
                              <tr key={route.routeId}>
                                <td>
                                  <span className={`rank-badge rank-${route.rank}`}>
                                    #{route.rank}
                                  </span>
                                </td>
                                <td>
                                  <strong>{route.routeName}</strong>
                                </td>
                                <td><code>{route.routeId}</code></td>
                                <td>
                                  <span
                                    className="table-congestion-dot"
                                    style={{ backgroundColor: styles.color }}
                                  ></span>
                                  {isBlocked ? "Blocked" : route.congestionLevel}
                                </td>
                                <td>{route.avgSpeed} km/h</td>
                                <td>
                                  <span className={`delay-text ${route.delayVariance > 10 ? "heavy-delay" : ""}`}>
                                    +{route.delayVariance} min
                                  </span>
                                </td>
                                <td>{route.activeVehicles}</td>
                                <td>
                                  <div className="table-rating-bar">
                                    <div className="rating-percentage" style={{ width: `${route.score}%`, backgroundColor: route.score > 70 ? 'var(--color-emerald)' : route.score > 40 ? 'var(--color-amber)' : 'var(--color-crimson)' }}></div>
                                    <span>{route.score}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "admin" && (
                /* VIEW: ADMIN CONFIGURATION CENTER */
                <div className="admin-view-wrapper">
                  <div className="admin-grid">
                    {/* LEFT PANEL: CONFIG FORM */}
                    <div className="admin-card">
                      <h2>Simulator Parameters</h2>
                      <p className="card-sub">
                        Mutate simulation parameters on-the-fly to model city grid pressures.
                      </p>

                      {adminNotification && (
                        <div className="alert success fade-in">{adminNotification}</div>
                      )}

                      <form onSubmit={handleAdminConfigSubmit} className="admin-form">
                        <div className="form-group-slider">
                          <div className="slider-header">
                            <label htmlFor="peakMultiplier">Peak Traffic Multiplier</label>
                            <span className="slider-value">{peakMultiplier.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            id="peakMultiplier"
                            min="0.5"
                            max="3.0"
                            step="0.1"
                            value={peakMultiplier}
                            onChange={(e) => setPeakMultiplier(parseFloat(e.target.value))}
                          />
                          <div className="slider-labels">
                            <span>0.5x (Night Time)</span>
                            <span>1.0x (Normal)</span>
                            <span>3.0x (Extreme Rush)</span>
                          </div>
                        </div>

                        <div className="form-group-slider">
                          <div className="slider-header">
                            <label htmlFor="incidentChance">Accident/Incident Frequency</label>
                            <span className="slider-value">{(incidentChance * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            id="incidentChance"
                            min="0.0"
                            max="1.0"
                            step="0.05"
                            value={incidentChance}
                            onChange={(e) => setIncidentChance(parseFloat(e.target.value))}
                          />
                          <div className="slider-labels">
                            <span>0% (Perfect flow)</span>
                            <span>50% (Unstable)</span>
                            <span>100% (Gridlock chaos)</span>
                          </div>
                        </div>

                        <div className="form-group-slider">
                          <div className="slider-header">
                            <label htmlFor="tickInterval">Telemetry Refresh Timing</label>
                            <span className="slider-value">{(tickInterval / 1000).toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            id="tickInterval"
                            min="1000"
                            max="15000"
                            step="500"
                            value={tickInterval}
                            onChange={(e) => setTickInterval(parseInt(e.target.value))}
                          />
                          <div className="slider-labels">
                            <span>1s (High Speed)</span>
                            <span>5s (Standard)</span>
                            <span>15s (Conserve Power)</span>
                          </div>
                        </div>

                        <div className="form-group-blockages">
                          <label className="blockage-label">Inject Route Specific Blockages</label>
                          <p className="blockage-sub">
                            Forces immediate construction work or total vehicle breakdown on selected routes.
                          </p>
                          <div className="blockages-checkbox-grid">
                            {routesMetadata.map((route) => (
                              <label key={route.routeId} className={`blockage-check-card ${blockages.includes(route.routeId) ? 'blocked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={blockages.includes(route.routeId)}
                                  onChange={() => handleBlockageToggle(route.routeId)}
                                />
                                <div className="blockage-check-content">
                                  <strong>{route.routeName}</strong>
                                  <span>ID: {route.routeId}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block">
                          Apply Simulation Adjustments
                        </button>
                      </form>
                    </div>

                    {/* RIGHT PANEL: SIMULATOR INFOGRAPH */}
                    <div className="admin-info-panel">
                      <div className="info-card">
                        <h3>Active Engine Metrics</h3>
                        <div className="info-row">
                          <span>Sim Loop Status</span>
                          <span className="status-badge running">Ticking</span>
                        </div>
                        <div className="info-row">
                          <span>Loop Interval</span>
                          <span>{simConfig.tickInterval} ms</span>
                        </div>
                        <div className="info-row">
                          <span>Active Multiplier</span>
                          <span>{simConfig.peakMultiplier}x scaling</span>
                        </div>
                        <div className="info-row">
                          <span>Active Inject Blocks</span>
                          <span>{simConfig.accidentalBlockages?.length || 0} routes</span>
                        </div>
                      </div>

                      <div className="warning-panel">
                        <h4>Security Notice</h4>
                        <p>
                          Changing simulator variables mutates the live Express pipeline matrix variables immediately. 
                          Traffic data points generated subsequently reflect these modified parameters. Keep database limits to 100 entries.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "profile" && (
                /* VIEW: OPERATOR PROFILE PAGE */
                <div className="profile-view-wrapper">
                  <div className="profile-grid">
                    <div className="profile-card">
                      <div className="profile-cover"></div>
                      <div className="profile-avatar-big">OP</div>
                      
                      <div className="profile-user-info">
                        <h2>{user?.username || "System Operator"}</h2>
                        <span className="profile-badge">{user?.role || "Control Center Operator"}</span>
                      </div>

                      <div className="profile-details-table">
                        <div className="profile-detail-row">
                          <span>Authorized Email</span>
                          <strong>{user?.email}</strong>
                        </div>
                        <div className="profile-detail-row">
                          <span>Assigned Authority Role</span>
                          <strong>{user?.role}</strong>
                        </div>
                        <div className="profile-detail-row">
                          <span>Session Time Connected</span>
                          <strong className="font-emerald">{formatSessionTime(sessionSeconds)}</strong>
                        </div>
                        <div className="profile-detail-row">
                          <span>Current Session Auth Token</span>
                          <code className="token-truncate" title={token}>{token}</code>
                        </div>
                      </div>
                    </div>

                    <div className="system-logs-card">
                      <h3>Local Operator logs</h3>
                      <p className="card-sub">Session action tracing logs (Local storage auditing)</p>
                      <div className="log-entries">
                        <div className="log-entry">
                          <span className="log-time">{new Date(loginTimeRef.current).toLocaleTimeString()}</span>
                          <span className="log-action">System initialized: Session token acquired successfully.</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">{new Date(loginTimeRef.current + 200).toLocaleTimeString()}</span>
                          <span className="log-action">Connected to MERN Optimization Engine backend proxy.</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">Active</span>
                          <span className="log-action">Real-Time syncing enabled (refresh speed: {simConfig.tickInterval / 1000}s).</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
