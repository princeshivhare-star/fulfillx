import { useState } from "react";
import { CheckCircle2, Clock3, MapPin, Truck } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Staging() {
  const { orders, loading, error, refreshOrders, updateOrderStatus } = useOrders();
  const [busy, setBusy] = useState("");
  const queue = orders.filter(o => o.status === "Staged");

  const ship = async id => {
    try { setBusy(id); await updateOrderStatus(id, "Shipped"); }
    catch (e) { alert(e.message || "Unable to dispatch."); }
    finally { setBusy(""); }
  };

  if (loading) return <Loading text="Loading staging area..." />;
  if (error) return <ErrorState message={error} onRetry={refreshOrders} />;

  return (
    <div className="page">
      <div className="page-header"><div><h1>Staging</h1><p>Packed boxes waiting for courier pickup.</p></div><div className="page-count">{queue.length} staged</div></div>

      <div className="staging-grid">
        {queue.map(order => (
          <div className="card stage-card" key={order.id}>
            <div className="stage-top">
              <div><h2>#{order.order_number}</h2><StatusBadge status={order.status} /></div>
              <div className="stage-slot">Lane {String((Number(order.id) % 6) + 1).padStart(2, "0")}</div>
            </div>
            <div className="stage-info"><MapPin size={16} /><span>Staging Lane {(Number(order.id) % 6) + 1}</span></div>
            <div className="stage-info"><Truck size={16} /><span>{order.courier}</span></div>
            <div className="stage-info"><Clock3 size={16} /><span>Pickup window: {order.pickup_window || "Today · 4:00 PM"}</span></div>
            <button className="button primary full" disabled={busy === order.id} onClick={() => ship(order.id)}>
              <CheckCircle2 size={17} /> {busy === order.id ? "Dispatching..." : "Handed to Courier"}
            </button>
          </div>
        ))}
      </div>

      {queue.length === 0 && <div className="empty-card"><CheckCircle2 size={42} className="green-text" /><h2>Staging area is clear</h2><p>No packed boxes are waiting for pickup.</p></div>}
    </div>
  );
}
