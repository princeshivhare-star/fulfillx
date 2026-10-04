import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getOrders, updateOrderStatus, confirmPick } from "../services/api";

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOrders = useCallback(async () => {
    try {
      setError("");
      const data = await getOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const changeStatus = async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    await refreshOrders();
  };

  const pickOrder = async (orderId) => {
    await confirmPick(orderId);
    await refreshOrders();
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        error,
        refreshOrders,
        updateOrderStatus: changeStatus,
        confirmPick: pickOrder
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error("useOrders must be used inside OrdersProvider");
  return context;
}
