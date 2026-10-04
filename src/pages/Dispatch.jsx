import { Truck, CheckCircle2, Clock3, PackageCheck } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Dispatch() {
  const { orders, loading, error, refreshOrders } = useOrders();
  const shipped = orders.filter(o => o.status === "Shipped");
  const staged = orders.filter(o => o.status === "Staged");

  if (loading) return <Loading text="Loading dispatch board..." />;
  if (error) return <ErrorState message={error} onRetry={refreshOrders} />;

  return (
    <div className="page">
      <div className="page-header"><div><h1>Dispatch</h1><p>Courier handover and shipment visibility.</p></div><div className="page-count">{staged.length} awaiting pickup</div></div>

      <div className="kpi-grid three">
        <div className="kpi-card"><div className="kpi-icon amber"><Clock3 size={19} /></div><div className="kpi-value">{staged.length}</div><div className="kpi-title">Awaiting pickup</div></div>
        <div className="kpi-card"><div className="kpi-icon green"><Truck size={19} /></div><div className="kpi-value">{shipped.length}</div><div className="kpi-title">Shipped today</div></div>
        <div className="kpi-card"><div className="kpi-icon blue"><PackageCheck size={19} /></div><div className="kpi-value">{orders.filter(o => o.status !== "Shipped").length}</div><div className="kpi-title">Still in fulfillment</div></div>
      </div>

      <section className="card">
        <div className="section-head"><div><h2>Courier board</h2><p>Monitor staged and shipped parcels.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Courier</th><th>Pickup window</th><th>Status</th><th>Tracking</th></tr></thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>#{order.order_number}</strong></td>
                  <td>{order.courier}</td>
                  <td>{order.pickup_window || "Today · 4:00 PM"}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{order.tracking_number || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
