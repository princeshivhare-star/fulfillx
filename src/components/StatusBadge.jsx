export default function StatusBadge({ status }) {
  const value = String(status || "Unknown");

  const className = {
    Priority: "badge red",
    Critical: "badge red",
    High: "badge red",
    Open: "badge red",
    Processing: "badge purple",
    Picking: "badge purple",
    Packing: "badge blue",
    Staged: "badge amber",
    Shipped: "badge green",
    Resolved: "badge green",
    Normal: "badge gray",
    Low: "badge gray",
    Requested: "badge amber",
    InTransit: "badge blue",
    Completed: "badge green"
  }[value] || "badge gray";

  return <span className={className}>{value}</span>;
}
