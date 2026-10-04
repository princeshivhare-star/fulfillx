import { useState } from "react";
import { Box, CheckCircle2, PackageCheck, Printer } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Packing() {
  const { orders, loading, error, refreshOrders, updateOrderStatus } = useOrders();
  const [busy, setBusy] = useState("");

  const queue = orders.filter(o => o.status === "Packing");

  const pack = async (id) => {
    try {
      setBusy(id);
      await updateOrderStatus(id, "Staged");
    } catch (e) {
      alert(e.message || "Unable to mark packed.");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <Loading text="Loading packing queue..." />;
  if (error) return <ErrorState message={error} onRetry={refreshOrders} />;

  return (
    <div className="page">
      <div className="page-header"><div><h1>Packing</h1><p>Verify contents, pack the shipment and move it to staging.</p></div><div className="page-count">{queue.length} waiting</div></div>

      {queue.map(order => (
        <div className="card pack-card" key={order.id}>
          <div className="section-head">
            <div className="title-row"><h2>#{order.order_number}</h2><StatusBadge status={order.priority} /><StatusBadge status={order.status} /></div>
            <span className="muted">Courier: {order.courier}</span>
          </div>

          <div className="pack-checks">
            {(order.order_items || []).map(item => (
              <div className="check-row" key={item.id}>
                <div className="check-icon"><PackageCheck size={18} /></div>
                <div><strong>{item.product_name}</strong><span>{item.sku} · {item.variant} · Qty {item.quantity}</span></div>
                <span className="checkmark">✓</span>
              </div>
            ))}
          </div>

          <div className="pack-actions">
            <button className="button secondary"><Printer size={16} /> Print label</button>
            <button className="button success" disabled={busy === order.id} onClick={() => pack(order.id)}>
              <CheckCircle2 size={17} /> {busy === order.id ? "Saving..." : "Packed & Stage"}
            </button>
          </div>
        </div>
      ))}

      {queue.length === 0 && <div className="empty-card"><CheckCircle2 size={42} className="green-text" /><h2>Packing queue is clear</h2><p>No picked orders are waiting for packing.</p></div>}
    </div>
  );
}
