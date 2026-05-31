import { useEffect, useState } from "react";
import axios from "axios";
import DashboardCard from "../components/DashboardCard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function DashboardPage() {
  const [trafficData, setTrafficData] = useState([]);
  const [transportData, setTransportData] = useState([]);
  const [bestRoute, setBestRoute] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      const [trafficRes, transportRes, bestRouteRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/traffic`),
        axios.get(`${API_BASE_URL}/transport`),
        axios.get(`${API_BASE_URL}/best-route`)
      ]);

      setTrafficData(trafficRes.data.data || []);
      setTransportData(transportRes.data.data || []);
      setBestRoute(bestRouteRes.data.data || null);
      setLastUpdated(new Date().toLocaleTimeString());
      setError("");
    } catch (apiError) {
      setError("Could not fetch data. Please check backend connection.");
      console.error(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
  <div className="page">
    <header className="page-header">
      <h1>🚦 Traffic Control Command Center</h1>
      <p>
        Real-time monitoring of traffic flow, transport systems, and route
        optimization.
      </p>

      <div className="live-status">
        <span className="live-dot" />
        <span>Live updates active</span>
      </div>
    </header>

    {isLoading ? <p>Loading dashboard...</p> : null}
    {error ? <p className="error">{error}</p> : null}

    {/* KPI CARDS */}
    <section className="grid">
      <DashboardCard title="🚦 Active Routes">
        <h2>{trafficData.length}</h2>
      </DashboardCard>

      <DashboardCard title="🚌 Transport Units">
        <h2>{transportData.length}</h2>
      </DashboardCard>

      <DashboardCard title="⚡ System Status">
        <h2 style={{ color: "#10b981" }}>ONLINE</h2>
      </DashboardCard>
    </section>

    {/* MAIN DASHBOARD */}
    <section className="grid">
      <DashboardCard title="Traffic Conditions">
        {trafficData.map((item) => (
          <div key={item.routeName} className="row">
            <strong>{item.routeName}</strong>

            <span
              style={{
                color:
                  item.congestionLevel === "High"
                    ? "#ef4444"
                    : item.congestionLevel === "Medium"
                    ? "#f59e0b"
                    : "#10b981"
              }}
            >
              {item.congestionLevel}
            </span>
          </div>
        ))}
      </DashboardCard>

      <DashboardCard title="Public Transport Timings">
        {transportData.map((item) => (
          <div key={item.lineName} className="row">
            <strong>{item.lineName}</strong>
            <span>{item.nextArrivalMinutes} mins</span>
          </div>
        ))}
      </DashboardCard>

      <DashboardCard title="Best Route Suggestion">
        {bestRoute ? (
          <div className="best-route">
            <p>
              <strong>Suggested Route:</strong>{" "}
              {bestRoute.suggestedRoute}
            </p>

            <p>
              <strong>Reason:</strong> {bestRoute.reason}
            </p>
          </div>
        ) : (
          <p>No suggestion available.</p>
        )}
      </DashboardCard>
    </section>

        <small className="updated-time">
      Last updated: {lastUpdated || "Not updated yet"} | Next refresh in ~5s
    </small>
  </div>
);
}

export default DashboardPage;