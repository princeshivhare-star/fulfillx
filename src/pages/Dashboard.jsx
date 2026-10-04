import { useEffect, useState } from "react";
import {
  AlertTriangle, Clock3, PackageCheck, Truck, Warehouse,
  ArrowUpRight, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDashboardData } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

function Kpi({ title, value, note, icon: Icon, tone = "blue" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div className={`kpi-icon ${tone}`}><Icon size={19} /></div>
        <span className="kpi-note">{note}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-title">{title}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      setError("");
      setData(await getDashboardData());
    } catch (e) {
      setError(e.message || "Could not load dashboard.");
    }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading text="Loading operations..." />;

  const { orders, issues, inventory, transfers } = data;
  const priority = orders.filter(o => o.priority === "Priority");
  const atRisk = orders.filter(o => o.status !== "Shipped" && new Date(o.sla_deadline) < new Date(Date.now() + 90 * 60000));
  const openIssues = issues.filter(i => i.status === "Open");
  const lowStock = inventory.filter(i => i.quantity <= i.reorder_level);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Good afternoon 👋</h1>
          <p>Here’s the operational picture for XYZ right now.</p>
        </div>
        <button className="button primary" onClick={() => navigate("/orders")}>
          View all orders <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="kpi-grid">
        <Kpi title="Orders today" value={orders.length} note="Live" icon={PackageCheck} tone="blue" />
        <Kpi title="Priority orders" value={priority.length} note="Same-day" icon={Clock3} tone="red" />
        <Kpi title="At-risk SLA" value={atRisk.length} note="Next 90 min" icon={AlertTriangle} tone="amber" />
        <Kpi title="Open issues" value={openIssues.length} note="Needs action" icon={AlertTriangle} tone="purple" />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <h2>Orders requiring attention</h2>
              <p>Priority and SLA-sensitive orders appear first.</p>
            </div>
            <button className="text-button" onClick={() => navigate("/orders")}>See all</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Priority</th>
                  <th>Status</th><th>SLA</th><th />
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 7).map(order => (
                  <tr key={order.id} className="click-row" onClick={() => navigate(`/orders/${order.id}`)}>
                    <td><strong>#{order.order_number}</strong></td>
                    <td>{order.customer}</td>
                    <td><StatusBadge status={order.priority} /></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className={atRisk.some(x => x.id === order.id) ? "danger-text" : ""}>
                      {formatSla(order.sla_deadline)}
                    </td>
                    <td><ArrowUpRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <h2>Operational alerts</h2>
              <p>Problems that can block fulfillment.</p>
            </div>
          </div>

          <div className="alert-list">
            {openIssues.slice(0, 4).map(issue => (
              <div className="alert-item" key={issue.id}>
                <div className="alert-icon red"><AlertTriangle size={17} /></div>
                <div className="alert-content">
                  <strong>{issue.type}</strong>
                  <span>Order #{issue.order_id || "—"} · {issue.owner}</span>
                </div>
                <StatusBadge status={issue.severity} />
              </div>
            ))}

            {lowStock.slice(0, 2).map(item => (
              <div className="alert-item" key={item.id}>
                <div className="alert-icon amber"><Warehouse size={17} /></div>
                <div className="alert-content">
                  <strong>Low stock · {item.sku}</strong>
                  <span>{item.product_name} · Main warehouse</span>
                </div>
                <button className="text-button" onClick={() => navigate("/inventory")}>Review</button>
              </div>
            ))}

            {openIssues.length === 0 && lowStock.length === 0 && (
              <div className="empty-small"><CheckCircle2 size={22} /> No active operational alerts.</div>
            )}
          </div>
        </section>
      </div>

      <div className="mini-grid">
        <div className="card mini-card">
          <div className="mini-icon blue"><PackageCheck size={18} /></div>
          <div><strong>Picking</strong><span>{orders.filter(o => o.status === "Picking").length} orders waiting</span></div>
          <button onClick={() => navigate("/picking")}>Open</button>
        </div>
        <div className="card mini-card">
          <div className="mini-icon purple"><PackageCheck size={18} /></div>
          <div><strong>Packing</strong><span>{orders.filter(o => o.status === "Packing").length} orders waiting</span></div>
          <button onClick={() => navigate("/packing")}>Open</button>
        </div>
        <div className="card mini-card">
          <div className="mini-icon amber"><Truck size={18} /></div>
          <div><strong>Dispatch</strong><span>{orders.filter(o => o.status === "Staged").length} staged</span></div>
          <button onClick={() => navigate("/dispatch")}>Open</button>
        </div>
        <div className="card mini-card">
          <div className="mini-icon green"><Warehouse size={18} /></div>
          <div><strong>Transfers</strong><span>{transfers.filter(t => t.status === "Requested").length} requested</span></div>
          <button onClick={() => navigate("/inventory")}>Open</button>
        </div>
      </div>
    </div>
  );
}

function formatSla(deadline) {
  const mins = Math.round((new Date(deadline) - Date.now()) / 60000);
  if (mins <= 0) return "Overdue";
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
