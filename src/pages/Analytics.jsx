import { useEffect, useState } from "react";
import { BarChart3, Clock3, CheckCircle2, AlertTriangle } from "lucide-react";
import { getDashboardData } from "../services/api";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try { setError(""); setData(await getDashboardData()); }
    catch (e) { setError(e.message || "Unable to load analytics."); }
  };

  useEffect(() => { load(); }, []);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading text="Calculating operational metrics..." />;

  const { orders, issues, transfers } = data;
  const total = orders.length || 1;
  const shipped = orders.filter(o => o.status === "Shipped").length;
  const priority = orders.filter(o => o.priority === "Priority").length;
  const openIssues = issues.filter(i => i.status === "Open").length;
  const transferRequests = transfers.filter(t => t.status === "Requested").length;

  const stages = ["Processing", "Picking", "Packing", "Staged", "Shipped"];

  return (
    <div className="page">
      <div className="page-header"><div><h1>Analytics</h1><p>Operational metrics for daily decision-making.</p></div></div>

      <div className="kpi-grid">
        <Metric icon={BarChart3} value={`${Math.round(shipped / total * 100)}%`} label="Shipment completion" />
        <Metric icon={Clock3} value={priority} label="Priority orders" />
        <Metric icon={AlertTriangle} value={openIssues} label="Open issues" />
        <Metric icon={CheckCircle2} value={transferRequests} label="Stock transfers pending" />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-head"><div><h2>Fulfillment funnel</h2><p>Where current orders are sitting.</p></div></div>
          <div className="bar-list">
            {stages.map(stage => {
              const count = orders.filter(o => o.status === stage).length;
              const pct = Math.max(5, count / total * 100);
              return <div className="bar-row" key={stage}><div><span>{stage}</span><strong>{count}</strong></div><div className="bar-track"><div className="bar-fill" style={{width: `${pct}%`}} /></div></div>;
            })}
          </div>
        </section>

        <section className="card">
          <div className="section-head"><div><h2>What this tells the operator</h2><p>Use the dashboard to prioritize work.</p></div></div>
          <div className="insight-list">
            <div><strong>1.</strong><span>Protect priority orders first because their SLA is time-sensitive.</span></div>
            <div><strong>2.</strong><span>Resolve inventory mismatches before they block picking.</span></div>
            <div><strong>3.</strong><span>Clear packing and staging queues before courier pickup windows.</span></div>
            <div><strong>4.</strong><span>Use issue ownership to prevent operational problems from being forgotten.</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label }) {
  return <div className="kpi-card"><div className="kpi-icon blue"><Icon size={19} /></div><div className="kpi-value">{value}</div><div className="kpi-title">{label}</div></div>;
}
