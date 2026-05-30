import { Link } from "react-router-dom";

function AboutPage() {
  return (
    <div className="page about-page">
      <section className="about-hero">
        <h1>About This Project</h1>
        <p>
          This is a beginner-friendly full-stack DevOps project designed for college demos and viva
          presentations.
        </p>
      </section>

      <div className="about-grid">
        <div className="about-box">
          <h3>Frontend</h3>
          <p>React + Vite with Axios and responsive cards.</p>
        </div>
        <div className="about-box">
          <h3>Backend</h3>
          <p>Node.js + Express with simple REST APIs.</p>
        </div>
        <div className="about-box">
          <h3>Database</h3>
          <p>MongoDB stores sample traffic and transport data.</p>
        </div>
        <div className="about-box">
          <h3>DevOps</h3>
          <p>Docker, Docker Compose, and GitHub Actions CI pipeline.</p>
        </div>
      </div>

      <section className="timeline">
        <h2>Implementation Flow</h2>
        <ol>
          <li>Data stored in MongoDB with simple traffic and transport entries.</li>
          <li>Express APIs expose traffic, transport, and best-route endpoints.</li>
          <li>React dashboard fetches and refreshes data every 5 seconds.</li>
          <li>Docker Compose runs frontend, backend, and database together.</li>
          <li>GitHub Actions validates build + Docker image generation on push.</li>
        </ol>
      </section>

      <section className="website-band">
        <div>
          <h2>Ready to see it in action?</h2>
          <p>Go to dashboard and check real-time update behavior.</p>
        </div>
        <Link to="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </section>
    </div>
  );
}

export default AboutPage;
