import HeroSection from "../components/HeroSection";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="page landing-page">
      <HeroSection />

      <section className="stats-strip landing-section">
        <div>
          <h3>3+</h3>
          <p>Core APIs integrated</p>
        </div>
        <div>
          <h3>5 sec</h3>
          <p>Auto-refresh cycle</p>
        </div>
        <div>
          <h3>100%</h3>
          <p>Dockerized stack</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading">
          <h2>Core Platform Capabilities</h2>
          <p>Built for fast demos, clear architecture, and real-time visibility.</p>
        </div>
        <section className="highlights">
          <article className="highlight-card">
            <h3>Live Traffic Status</h3>
            <p>See congestion levels as High, Medium, or Low for major routes.</p>
          </article>
          <article className="highlight-card">
            <h3>Transport Timings</h3>
            <p>Track upcoming bus and metro arrival times in one place.</p>
          </article>
          <article className="highlight-card">
            <h3>Best Route Suggestions</h3>
            <p>Get a quick recommendation when traffic becomes heavy.</p>
          </article>
        </section>
      </section>

      <section className="landing-section split-feature">
        <div className="split-feature-content">
          <h2>Why this looks production-ready</h2>
          <p>
            Clean page hierarchy, reusable components, responsive layout, and consistent color system
            make this feel like a proper product website.
          </p>
          <ul>
            <li>Professional navigation and footer shell</li>
            <li>Dedicated pages for Home, Dashboard, and About</li>
            <li>Real-time status behavior with live refresh cues</li>
          </ul>
        </div>
        <div className="split-feature-panel">
          <h3>DevOps Stack</h3>
          <p>Docker + Compose + GitHub Actions</p>
          <h3>Frontend/Backend</h3>
          <p>React + Vite + Express + MongoDB</p>
        </div>
      </section>

      <section className="website-band landing-section">
        <div>
          <h2>How it works</h2>
          <p>Backend serves route data, frontend polls every 5 seconds, dashboard updates instantly.</p>
        </div>
        <Link to="/dashboard" className="btn btn-primary">
          Open Live Dashboard
        </Link>
      </section>
    </div>
  );
}

export default HomePage;
