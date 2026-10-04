import {
  LayoutDashboard, ShoppingCart, PackageCheck, Box, Truck,
  Warehouse, AlertTriangle, BarChart3
} from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  ["Dashboard", "/", LayoutDashboard],
  ["Orders", "/orders", ShoppingCart],
  ["Picking", "/picking", PackageCheck],
  ["Packing", "/packing", Box],
  ["Staging", "/staging", PackageCheck],
  ["Dispatch", "/dispatch", Truck],
  ["Inventory", "/inventory", Warehouse],
  ["Issues", "/issues", AlertTriangle],
  ["Analytics", "/analytics", BarChart3]
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">Fulfill<span>X</span></div>
        <div className="brand-subtitle">Fulfillment Operations Hub</div>
      </div>

      <nav className="nav">
        {items.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="live-dot" />
        <span>Operations system online</span>
      </div>
    </aside>
  );
}
