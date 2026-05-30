function DashboardCard({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export default DashboardCard;
