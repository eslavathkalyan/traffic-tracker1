import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand-wrap">
        <div className="brand-badge">TF</div>
        <div className="brand">TrafficFlow</div>
      </div>
      <div className="nav-right">
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Dashboard
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            About
          </NavLink>
        </div>
        <NavLink to="/dashboard" className="nav-cta">
          Live Panel
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
