import { supabase } from "../lib/supabase";

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function getOrders() {
  const result = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id, sku, product_name, variant, quantity, picked_quantity,
        pick_location, warehouse_id
      ),
      warehouse:warehouses!orders_warehouse_id_fkey (
        id, name, code
      )
    `)
    .order("priority_rank", { ascending: true })
    .order("sla_deadline", { ascending: true });

  return unwrap(result);
}

export async function getOrder(orderId) {
  const result = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id, sku, product_name, variant, quantity, picked_quantity,
        pick_location, warehouse_id
      ),
      warehouse:warehouses!orders_warehouse_id_fkey (
        id, name, code
      )
    `)
    .eq("id", orderId)
    .single();

  return unwrap(result);
}


export async function createOrder({ customer, priority, courier, shippingService, slaHours, items }) {
  const result = await supabase.rpc("create_fulfillment_order", {
    p_order: {
      customer,
      priority,
      courier,
      shipping_service: shippingService,
      sla_hours: Number(slaHours) || 24,
      items
    }
  });

  return unwrap(result);
}

export async function updateOrderStatus(orderId, status) {
  const result = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();

  return unwrap(result);
}

export async function confirmPick(orderId) {
  const result = await supabase.rpc("confirm_order_pick", {
    p_order_id: orderId
  });

  return unwrap(result);
}

export async function getInventory() {
  const result = await supabase
    .from("inventory")
    .select(`
      *,
      warehouse:warehouses (
        id, name, code
      )
    `)
    .order("sku");

  return unwrap(result);
}

export async function createTransfer({ sku, productName, quantity, fromWarehouse, toWarehouse, reason, orderId }) {
  const result = await supabase
    .from("stock_transfers")
    .insert({
      sku,
      product_name: productName,
      quantity,
      from_warehouse_id: fromWarehouse,
      to_warehouse_id: toWarehouse,
      reason,
      order_id: orderId || null,
      status: "Requested"
    })
    .select()
    .single();

  return unwrap(result);
}

export async function completeTransfer(transferId) {
  const result = await supabase.rpc("complete_stock_transfer", {
    p_transfer_id: transferId
  });

  return unwrap(result);
}

export async function getTransfers() {
  const result = await supabase
    .from("stock_transfers")
    .select(`
      *,
      from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name, code),
      to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name, code)
    `)
    .order("created_at", { ascending: false });

  return unwrap(result);
}

export async function getIssues() {
  const result = await supabase
    .from("issues")
    .select("*")
    .order("status", { ascending: true })
    .order("severity", { ascending: true })
    .order("created_at", { ascending: false });

  return unwrap(result);
}

export async function resolveIssue(id) {
  const result = await supabase
    .from("issues")
    .update({
      status: "Resolved",
      resolved_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  return unwrap(result);
}

export async function createIssue(payload) {
  const result = await supabase
    .from("issues")
    .insert(payload)
    .select()
    .single();

  return unwrap(result);
}

export async function getDashboardData() {
  const [orders, issues, inventory, transfers] = await Promise.all([
    getOrders(),
    getIssues(),
    getInventory(),
    getTransfers()
  ]);

  return { orders, issues, inventory, transfers };
}
