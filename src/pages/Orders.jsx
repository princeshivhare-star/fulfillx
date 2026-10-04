import { useMemo, useState } from "react";
import { Search, Filter, ArrowUpRight, Plus, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "../context/OrdersContext";
import { createOrder } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Orders() {
  const { orders, loading, error, refreshOrders } = useOrders();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer: "", priority: "Normal", courier: "Delhivery", shippingService: "Standard", slaHours: 24,
    items: [{ sku: "SKU-1001", product_name: "Wireless Headphones", variant: "Black", quantity: 1 }]
  });
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(order => {
      const matchesSearch =
        String(order.order_number).toLowerCase().includes(q) ||
        String(order.customer).toLowerCase().includes(q);
      const matchesStatus = status === "All" || order.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);

  if (loading) return <Loading text="Loading orders..." />;
  if (error) return <ErrorState message={error} onRetry={refreshOrders} />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>One operational view from order received to shipment.</p>
        </div>
        <div className="page-actions">
          <div className="page-count">{filtered.length} orders</div>
          <button className="button primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add New Order</button>
        </div>
      </div>

      <div className="card toolbar">
        <div className="search-box large">
          <Search size={17} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order or customer..." />
        </div>
        <div className="filter">
          <Filter size={16} />
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option>All</option>
            <option>Processing</option>
            <option>Picking</option>
            <option>Packing</option>
            <option>Staged</option>
            <option>Shipped</option>
          </select>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Priority</th><th>Status</th>
                <th>Items</th><th>SLA</th><th>Courier</th><th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="click-row" onClick={() => navigate(`/orders/${order.id}`)}>
                  <td><strong>#{order.order_number}</strong></td>
                  <td>{order.customer}</td>
                  <td><StatusBadge status={order.priority} /></td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{order.item_count}</td>
                  <td className={new Date(order.sla_deadline) < new Date(Date.now() + 90 * 60000) ? "danger-text" : ""}>
                    {formatSla(order.sla_deadline)}
                  </td>
                  <td>{order.courier}</td>
                  <td><ArrowUpRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={() => !saving && setShowCreate(false)}>
          <div className="modal order-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head">
              <div><h2>Create New Order</h2><p>Staff can manually add an order directly into the fulfillment queue.</p></div>
              <button className="icon-button" onClick={() => setShowCreate(false)} disabled={saving}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <label>Customer<input value={form.customer} onChange={e => setForm({...form, customer:e.target.value})} placeholder="Customer name" /></label>
              <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}><option>Normal</option><option>Priority</option></select></label>
              <label>Courier<select value={form.courier} onChange={e => setForm({...form, courier:e.target.value})}><option>Delhivery</option><option>Blue Dart</option><option>Shiprocket</option><option>Ekart</option></select></label>
              <label>Service<select value={form.shippingService} onChange={e => setForm({...form, shippingService:e.target.value})}><option>Standard</option><option>Express</option><option>Same Day</option></select></label>
              <label>SLA hours<input type="number" min="1" max="72" value={form.slaHours} onChange={e => setForm({...form, slaHours:e.target.value})} /></label>
            </div>
            <div className="order-items-editor">
              <div className="editor-head"><strong>Products</strong><button className="text-button" type="button" onClick={() => setForm({...form, items:[...form.items,{sku:"SKU-1001",product_name:"Wireless Headphones",variant:"Black",quantity:1}]})}><Plus size={14}/> Add item</button></div>
              {form.items.map((item, index) => (
                <div className="form-grid item-editor" key={index}>
                  <label>Product<select value={item.sku} onChange={e => { const catalog=PRODUCT_CATALOG.find(p=>p.sku===e.target.value); const items=[...form.items]; items[index]={...items[index],...catalog}; setForm({...form,items}); }} >{PRODUCT_CATALOG.map(p=><option key={p.sku} value={p.sku}>{p.product_name} — {p.variant}</option>)}</select></label>
                  <label>Quantity<input type="number" min="1" value={item.quantity} onChange={e => { const items=[...form.items]; items[index]={...items[index],quantity:Number(e.target.value)}; setForm({...form,items}); }} /></label>
                  {form.items.length > 1 && <button className="remove-item" type="button" onClick={() => setForm({...form,items:form.items.filter((_,i)=>i!==index)})}><Trash2 size={15}/> Remove</button>}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
              <button className="button primary" disabled={saving || !form.customer.trim() || !form.items.length} onClick={async () => {
                try { setSaving(true); const created = await createOrder(form); await refreshOrders(); setShowCreate(false); navigate(`/orders/${created.id}`); }
                catch(e) { alert(e.message || "Unable to create order."); } finally { setSaving(false); }
              }}>{saving ? "Creating..." : "Create Order"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PRODUCT_CATALOG = [
  { sku:"SKU-1001", product_name:"Wireless Headphones", variant:"Black" },
  { sku:"SKU-1002", product_name:"Mechanical Keyboard", variant:"RGB" },
  { sku:"SKU-1003", product_name:"USB-C Hub", variant:"7-in-1" },
  { sku:"SKU-1004", product_name:"Smart Watch", variant:"Midnight" },
  { sku:"SKU-1005", product_name:"Travel Backpack", variant:"28L Black" },
  { sku:"SKU-1006", product_name:"Power Bank", variant:"20,000mAh" }
];

function formatSla(deadline) {
  const mins = Math.round((new Date(deadline) - Date.now()) / 60000);
  if (mins <= 0) return "Overdue";
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
