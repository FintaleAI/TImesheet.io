import { LoginPanel } from "@/components/login-panel";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero-grid">
        <div className="panel hero">
          <div className="badge-row">
            <span className="badge">Next.js frontend</span>
            <span className="badge">FastAPI backend</span>
            <span className="badge">Neon PostgreSQL</span>
          </div>
          <h1>Track your work. Own your time.</h1>
          <p>
            Fintale Timesheet is the internal platform for logging project hours,
            managing employees, and reviewing submissions — built for the whole team,
            from first login to full SSO.
          </p>
          <div className="metric-row">
            <div className="metric">
              <strong>Phase 1</strong>
              <span>Admin-created username and password login</span>
            </div>
            <div className="metric">
              <strong>Phase 2</strong>
              <span>Company email login on the same identity model</span>
            </div>
            <div className="metric">
              <strong>Phase 3</strong>
              <span>SSO-ready structure without a database redesign</span>
            </div>
          </div>
        </div>

        <LoginPanel />
      </section>
    </main>
  );
}
