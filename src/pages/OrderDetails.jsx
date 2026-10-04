import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Package, Truck, CheckCircle2, Circle, Clock3, AlertTriangle, Play, Box, Printer, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrder, updateOrderStatus, confirmPick } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

const steps = ["Processing", "Picking", "Packing", "Staged", "Shipped"];

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifiedItems, setVerifiedItems] = useState({});

  const load = async () => {
    try {
      setError("");
      setOrder(await getOrder(orderId));
    } catch (e) {
      setError(e.message || "Order not found.");
    }
  };

  useEffect(() => { load(); }, [orderId]);

  useEffect(() => {
    if (order?.order_items) {
      const next = {};
      order.order_items.forEach(item => {
        next[item.id] = item.picked_quantity >= item.quantity;
      });
      setVerifiedItems(next);
    }
  }, [order?.id]);

  const allItemsVerified = (order?.order_items || []).length > 0 &&
    (order.order_items || []).every(item => verifiedItems[item.id]);

  const nextStage = {
    Processing: "Picking",
    Picking: "Packing",
    Packing: "Staged",
    Staged: "Shipped"
  };

  const handleAdvance = async () => {
    const next = nextStage[order.status];
    if (!next) return;
    if ((order.status === "Picking" || order.status === "Packing") && !allItemsVerified) {
      alert("Please verify every item before moving this order forward.");
      return;
    }
    try {
      setBusy(true);
      if (order.status === "Picking") {
        await confirmPick(order.id);
      } else {
        await updateOrderStatus(order.id, next);
      }
      await load();
    } catch (e) {
      alert(e.message || "Unable to update order status.");
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = (id) => {
    setVerifiedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <Loading text="Loading order..." />;

  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="page">
      <button className="back-button" onClick={() => navigate("/orders")}><ArrowLeft size={16} /> Back to Orders</button>

      <div className="page-header">
        <div>
          <div className="title-row">
            <h1>Order #{order.order_number}</h1>
            <StatusBadge status={order.priority} />
            <StatusBadge status={order.status} />
          </div>
          <p>Customer: {order.customer}</p>
        </div>
        <div className="sla-box">
          <span>SLA remaining</span>
          <strong>{formatSla(order.sla_deadline)}</strong>
        </div>
      </div>

      <section className="card workflow-control">
        <div className="section-head">
          <div><h2>Staff Workflow Controls</h2><p>Every fulfillment step can be completed manually by the responsible staff member.</p></div>
          <StatusBadge status={order.status} />
        </div>
        <div className="workflow-actions">
          <button className="button secondary" onClick={() => window.print()}><Printer size={16} /> Print / Label</button>
          {order.status !== "Shipped" && (
            <button className="button primary" disabled={busy || ((order.status === "Picking" || order.status === "Packing") && !allItemsVerified)} onClick={handleAdvance}>
              {order.status === "Processing" && <><Play size={16} /> Release to Picking</>}
              {order.status === "Picking" && <><CheckCircle2 size={16} /> Confirm Pick</>}
              {order.status === "Packing" && <><Box size={16} /> Pack & Stage</>}
              {order.status === "Staged" && <><Send size={16} /> Hand to Courier</>}
            </button>
          )}
          {order.status === "Shipped" && <span className="workflow-complete"><CheckCircle2 size={17} /> Shipment completed</span>}
        </div>
        {order.status === "Picking" || order.status === "Packing" ? (
          <div className="verification-note"><AlertTriangle size={15} /> {allItemsVerified ? "All items verified. Ready for the next step." : "Verify every item below before continuing."}</div>
        ) : null}
      </section>

      <div className="detail-grid">
        <section className="card">
          <div className="section-head">
            <div><h2>Fulfillment Timeline</h2><p>Current operational state of this order.</p></div>
          </div>

          <div className="timeline">
            {steps.map((step, index) => {
              const completed = currentIndex > index;
              const current = currentIndex === index;
              return (
                <div className="timeline-row" key={step}>
                  <div className="timeline-marker">
                    {completed ? <CheckCircle2 className="green-text" size={20} /> :
                     current ? <Clock3 className="blue-text" size={20} /> :
                     <Circle className="muted-text" size={20} />}
                    {index < steps.length - 1 && <div className={`timeline-line ${completed ? "done" : ""}`} />}
                  </div>
                  <div className="timeline-copy">
                    <strong>{step}</strong>
                    <span>{completed ? "Completed" : current ? "In progress" : "Waiting"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <div className="section-head"><div><h2>Order Items</h2><p>Verify SKU, variant and quantity.</p></div><Package size={20} /></div>
            <div className="item-list">
              {(order.order_items || []).map(item => (
                <div className={`item-row ${verifiedItems[item.id] ? "item-verified" : ""}`} key={item.id}>
                  <div className="item-main">
                    <button className={`item-check ${verifiedItems[item.id] ? "checked" : ""}`} onClick={() => toggleItem(item.id)} aria-label={`Verify ${item.product_name}`}>
                      {verifiedItems[item.id] ? <CheckCircle2 size={19} /> : <Circle size={19} />}
                    </button>
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>{item.sku} · {item.variant}</span>
                      <small><MapPin size={12} /> {item.pick_location}</small>
                    </div>
                  </div>
                  <strong>× {item.quantity}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="card info-card">
            <div className="info-line"><MapPin size={17} /><div><span>Warehouse</span><strong>{order.warehouse?.name || "Main Warehouse"}</strong></div></div>
            <div className="info-line"><Truck size={17} /><div><span>Courier</span><strong>{order.courier}</strong></div></div>
            <div className="info-line"><AlertTriangle size={17} /><div><span>Shipping service</span><strong>{order.shipping_service || "Standard"}</strong></div></div>
          </section>
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
