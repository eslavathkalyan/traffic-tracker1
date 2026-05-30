import { Link } from "react-router-dom";

function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>Smart City Mobility Dashboard</h1>
        <p>
          Monitor live traffic congestion, check public transport arrivals, and choose better routes in
          seconds.
        </p>
        <div className="hero-tags">
          <span>Real-time updates</span>
          <span>DevOps ready</span>
          <span>Beginner friendly</span>
        </div>
        <div className="hero-actions">
          <Link to="/dashboard" className="btn btn-primary">
            View Dashboard
          </Link>
          <Link to="/about" className="btn btn-secondary">
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
