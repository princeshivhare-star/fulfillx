import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, PackageX, RefreshCw, Warehouse } from "lucide-react";
import { getInventory, getTransfers, createTransfer, completeTransfer } from "../services/api";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";
import StatusBadge from "../components/StatusBadge";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      setError("");
      const [inv, tr] = await Promise.all([getInventory(), getTransfers()]);
      setInventory(inv || []);
      setTransfers(tr || []);
    } catch (e) {
      setError(e.message || "Unable to load inventory.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const low = inventory.filter(x => x.quantity <= x.reorder_level);
  const out = inventory.filter(x => x.quantity === 0);
  const requested = transfers.filter(x => x.status === "Requested");

  const create = async item => {
    const secondary = inventory.find(x => x.sku === item.sku && x.warehouse?.code === "SECONDARY");
    if (!secondary || secondary.quantity < 1) {
      alert("No transferable stock is available in the secondary warehouse.");
      return;
    }
    const qty = Math.min(Math.max(item.reorder_level - item.quantity, 1), secondary.quantity);
    try {
      setBusy(item.sku);
      await createTransfer({
        sku: item.sku,
        productName: item.product_name,
        quantity: qty,
        fromWarehouse: secondary.warehouse_id,
        toWarehouse: item.warehouse_id,
        reason: "Replenish main warehouse for fulfillment"
      });
      await load();
    } catch (e) { alert(e.message || "Transfer could not be created."); }
    finally { setBusy(""); }
  };

  const complete = async id => {
    try { setBusy(id); await completeTransfer(id); await load(); }
    catch (e) { alert(e.message || "Transfer could not be completed."); }
    finally { setBusy(""); }
  };

  if (loading) return <Loading text="Loading inventory..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const main = inventory.filter(x => x.warehouse?.code === "MAIN");

  return (
    <div className="page">
      <div className="page-header"><div><h1>Inventory Control</h1><p>Keep the main warehouse fulfillable and make stock movement visible.</p></div><button className="button secondary" onClick={load}><RefreshCw size={16} /> Refresh</button></div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-icon blue"><Warehouse size={19} /></div><div className="kpi-value">{main.length}</div><div className="kpi-title">Tracked SKUs</div></div>
        <div className="kpi-card"><div className="kpi-icon amber"><PackageX size={19} /></div><div className="kpi-value">{low.length}</div><div className="kpi-title">Low stock</div></div>
        <div className="kpi-card"><div className="kpi-icon red"><PackageX size={19} /></div><div className="kpi-value">{out.length}</div><div className="kpi-title">Out of stock</div></div>
        <div className="kpi-card"><div className="kpi-icon purple"><ArrowRight size={19} /></div><div className="kpi-value">{requested.length}</div><div className="kpi-title">Transfers requested</div></div>
      </div>

      <section className="card">
        <div className="section-head"><div><h2>Main warehouse inventory</h2><p>Stock available for current fulfillment.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Product</th><th>Main stock</th><th>Secondary</th><th>Location</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {main.map(item => {
                const secondary = inventory.find(x => x.sku === item.sku && x.warehouse?.code === "SECONDARY");
                const needs = item.quantity <= item.reorder_level;
                return (
                  <tr key={item.id}>
                    <td><strong>{item.sku}</strong></td>
                    <td>{item.product_name}<span className="subtext">{item.variant}</span></td>
                    <td className={item.quantity === 0 ? "danger-text strong" : ""}>{item.quantity}</td>
                    <td>{secondary?.quantity ?? 0}</td>
                    <td>{item.location}</td>
                    <td><StatusBadge status={item.quantity === 0 ? "Critical" : needs ? "Low" : "Healthy"} /></td>
                    <td>{needs && secondary?.quantity > 0 ? <button className="text-button" disabled={busy === item.sku} onClick={() => create(item)}>{busy === item.sku ? "Creating..." : "Create transfer"}</button> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-head"><div><h2>Stock transfers</h2><p>Every movement between warehouses is recorded.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Quantity</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.sku}</strong></td><td>{t.quantity}</td>
                  <td>{t.from_warehouse?.name}</td><td>{t.to_warehouse?.name}</td>
                  <td>{t.reason}</td><td><StatusBadge status={t.status} /></td>
                  <td>{t.status === "Requested" && <button className="text-button" disabled={busy === t.id} onClick={() => complete(t.id)}>Complete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transfers.length === 0 && <div className="empty-small"><CheckCircle2 size={20} /> No transfers yet.</div>}
      </section>
    </div>
  );
}
