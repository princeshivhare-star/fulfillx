import { Bell, Search, UserRound } from "lucide-react";

export default function Header() {
  return (
    <header className="header">
      <div className="search-box">
        <Search size={17} />
        <input placeholder="Search orders, customers, SKUs..." />
      </div>

      <div className="header-right">
        <button className="icon-button" title="Notifications">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <div className="user-chip">
          <div className="avatar"><UserRound size={16} /></div>
          <div>
            <div className="user-name">Operations Manager</div>
            <div className="user-role">XYZ Fulfillment</div>
          </div>
        </div>
      </div>
    </header>
  );
}
