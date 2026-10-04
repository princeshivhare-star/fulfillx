import { useState } from "react";
import { PackageCheck, MapPin, Clock3, CheckCircle2, AlertTriangle } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Picking() {
  const { orders, loading, error, refreshOrders, confirmPick } = useOrders();
  const [busy, setBusy] = useState("");

  const pickingOrders = orders.filter(order => order.status === "Picking");

  const handlePick = async (orderId) => {
    try {
      setBusy(orderId);
      await confirmPick(orderId);
    } catch (e) {
      alert(e.message || "Unable to confirm pick.");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <Loading text="Loading picking queue..." />;
  if (error) return <ErrorState message={error} onRetry={refreshOrders} />;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Picking Queue</h1><p>Simple, low-friction instructions for warehouse workers.</p></div>
        <div className="page-count">{pickingOrders.length} orders waiting</div>
      </div>

      <div className="instruction">
        <PackageCheck size={20} />
        <div><strong>Picking rule</strong><span>Verify the exact SKU, variant and quantity before confirming.</span></div>
      </div>

      {pickingOrders.map(order => (
        <div className="card pick-card" key={order.id}>
          <div className="pick-header">
            <div className="title-row"><h2>#{order.order_number}</h2><StatusBadge status={order.priority} /><StatusBadge status={order.status} /></div>
            <div className="sla-inline"><Clock3 size={16} /> {formatSla(order.sla_deadline)} remaining</div>
          </div>

          <div className="pick-content">
            <div className="three-col">
              <div><label>Customer</label><strong>{order.customer}</strong></div>
              <div><label>Items</label><strong>{order.item_count} item(s)</strong></div>
              <div><label>Courier</label><strong>{order.courier}</strong></div>
            </div>

            {(order.order_items || []).map(item => (
              <div className="pick-item" key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <span>{item.sku} · {item.variant} · Qty {item.quantity}</span>
                </div>
                <div className="pick-location"><MapPin size={17} /><strong>{item.pick_location}</strong></div>
              </div>
            ))}

            <div className="pick-footer">
              <div className="warning-line"><AlertTriangle size={16} /> Physically verify product before confirmation.</div>
              <button
                className="button success"
                disabled={busy === order.id}
                onClick={() => handlePick(order.id)}
              >
                <CheckCircle2 size={17} />
                {busy === order.id ? "Confirming..." : "Confirm Pick"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {pickingOrders.length === 0 && (
        <div className="empty-card"><CheckCircle2 size={42} className="green-text" /><h2>Picking queue is clear</h2><p>All currently released orders have been picked.</p></div>
      )}
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
