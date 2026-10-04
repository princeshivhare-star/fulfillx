import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { createIssue, getIssues, resolveIssue } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import Loading from "../components/Loading";
import ErrorState from "../components/ErrorState";

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order_id: "", type: "Inventory mismatch", description: "", severity: "High", owner: "Warehouse" });

  const load = async () => {
    try { setError(""); setIssues(await getIssues()); }
    catch (e) { setError(e.message || "Unable to load issues."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    try {
      await createIssue(form);
      setShowForm(false);
      setForm({ order_id: "", type: "Inventory mismatch", description: "", severity: "High", owner: "Warehouse" });
      await load();
    } catch (e) { alert(e.message || "Could not create issue."); }
  };

  const resolve = async id => {
    try { await resolveIssue(id); await load(); }
    catch (e) { alert(e.message || "Could not resolve issue."); }
  };

  if (loading) return <Loading text="Loading issues..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Issues</h1><p>Turn informal problems into owned, trackable work.</p></div>
        <button className="button primary" onClick={() => setShowForm(true)}><Plus size={17} /> Log issue</button>
      </div>

      <div className="issue-summary">
        <div className="card summary-box"><strong>{issues.filter(i => i.status === "Open").length}</strong><span>Open issues</span></div>
        <div className="card summary-box"><strong>{issues.filter(i => i.severity === "High" && i.status === "Open").length}</strong><span>High priority</span></div>
        <div className="card summary-box"><strong>{issues.filter(i => i.status === "Resolved").length}</strong><span>Resolved</span></div>
      </div>

      <div className="issue-list">
        {issues.map(issue => (
          <div className="card issue-card" key={issue.id}>
            <div className="issue-icon"><AlertTriangle size={19} /></div>
            <div className="issue-main">
              <div className="title-row"><h2>{issue.type}</h2><StatusBadge status={issue.severity} /><StatusBadge status={issue.status} /></div>
              <p>{issue.description}</p>
              <div className="meta">Issue #{issue.id} · Order #{issue.order_id || "—"} · Owner: {issue.owner}</div>
            </div>
            {issue.status === "Open" && <button className="button secondary" onClick={() => resolve(issue.id)}><CheckCircle2 size={16} /> Resolve</button>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submit}>
            <div className="modal-head"><div><h2>Log operational issue</h2><p>Create a trackable issue instead of relying on informal communication.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div>
            <label>Order ID<input value={form.order_id} onChange={e => setForm({...form, order_id: e.target.value})} placeholder="10482" /></label>
            <label>Issue type<select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Inventory mismatch</option><option>Wrong variant</option><option>Missing label</option><option>Damaged item</option><option>Box misplaced</option><option>Courier delay</option></select></label>
            <label>Description<textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe what happened..." /></label>
            <div className="form-grid">
              <label>Severity<select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option>High</option><option>Medium</option><option>Low</option></select></label>
              <label>Owner<select value={form.owner} onChange={e => setForm({...form, owner: e.target.value})}><option>Warehouse</option><option>Picking</option><option>Packing</option><option>Dispatch</option><option>Office</option></select></label>
            </div>
            <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary">Create issue</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
