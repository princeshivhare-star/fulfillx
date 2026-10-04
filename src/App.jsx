import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Picking from "./pages/Picking";
import Packing from "./pages/Packing";
import Staging from "./pages/Staging";
import Dispatch from "./pages/Dispatch";
import Inventory from "./pages/Inventory";
import Issues from "./pages/Issues";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetails />} />
        <Route path="/picking" element={<Picking />} />
        <Route path="/packing" element={<Packing />} />
        <Route path="/staging" element={<Staging />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </DashboardLayout>
  );
}
