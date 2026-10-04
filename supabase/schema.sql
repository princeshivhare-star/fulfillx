-- FulfillX database schema
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

drop function if exists public.confirm_order_pick(uuid);
drop function if exists public.complete_stock_transfer(uuid);

drop table if exists public.issues cascade;
drop table if exists public.stock_transfers cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.inventory cascade;
drop table if exists public.warehouses cascade;

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer text not null,
  priority text not null default 'Normal' check (priority in ('Normal','Priority')),
  priority_rank int not null default 2,
  status text not null default 'Processing' check (status in ('Processing','Picking','Packing','Staged','Shipped')),
  warehouse_id uuid not null references public.warehouses(id),
  courier text not null,
  shipping_service text default 'Standard',
  tracking_number text,
  pickup_window text default 'Today · 4:00 PM',
  sla_deadline timestamptz not null,
  item_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sku text not null,
  product_name text not null,
  variant text not null,
  quantity int not null check (quantity > 0),
  picked_quantity int not null default 0,
  pick_location text not null,
  warehouse_id uuid not null references public.warehouses(id),
  created_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text not null,
  variant text not null,
  warehouse_id uuid not null references public.warehouses(id),
  quantity int not null default 0 check (quantity >= 0),
  reorder_level int not null default 5,
  location text not null,
  updated_at timestamptz not null default now(),
  unique(sku, warehouse_id)
);

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  from_warehouse_id uuid not null references public.warehouses(id),
  to_warehouse_id uuid not null references public.warehouses(id),
  reason text not null,
  order_id uuid references public.orders(id),
  status text not null default 'Requested' check (status in ('Requested','InTransit','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.issues (
  id bigint generated always as identity primary key,
  order_id text,
  type text not null,
  description text not null,
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  owner text not null,
  status text not null default 'Open' check (status in ('Open','Resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index orders_status_idx on public.orders(status);
create index orders_sla_idx on public.orders(sla_deadline);
create index inventory_sku_idx on public.inventory(sku);
create index issues_status_idx on public.issues(status);

-- Demo RLS:
-- This take-home is intentionally a public demo. For production, replace these
-- policies with authenticated role policies and Supabase Auth.
alter table public.warehouses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.issues enable row level security;

create policy "demo warehouses read" on public.warehouses for select to anon, authenticated using (true);
create policy "demo orders read" on public.orders for select to anon, authenticated using (true);
create policy "demo orders insert" on public.orders for insert to anon, authenticated with check (true);
create policy "demo orders update" on public.orders for update to anon, authenticated using (true) with check (true);
create policy "demo order items read" on public.order_items for select to anon, authenticated using (true);
create policy "demo order items insert" on public.order_items for insert to anon, authenticated with check (true);
create policy "demo inventory read" on public.inventory for select to anon, authenticated using (true);
create policy "demo inventory update" on public.inventory for update to anon, authenticated using (true) with check (true);
create policy "demo transfers read" on public.stock_transfers for select to anon, authenticated using (true);
create policy "demo transfers insert" on public.stock_transfers for insert to anon, authenticated with check (true);
create policy "demo transfers update" on public.stock_transfers for update to anon, authenticated using (true) with check (true);
create policy "demo issues read" on public.issues for select to anon, authenticated using (true);
create policy "demo issues insert" on public.issues for insert to anon, authenticated with check (true);
create policy "demo issues update" on public.issues for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.orders to anon, authenticated;
grant select, insert on public.order_items to anon, authenticated;
grant select on public.warehouses to anon, authenticated;
grant select, update on public.inventory to anon, authenticated;
grant select, insert, update on public.stock_transfers to anon, authenticated;
grant select, insert, update on public.issues to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Server-side operation: create a new staff-entered fulfillment order and its items atomically.
create or replace function public.create_fulfillment_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  main_wh public.warehouses;
  new_order public.orders;
  next_number bigint;
  item jsonb;
  items jsonb := coalesce(p_order->'items', '[]'::jsonb);
  sla_hours int := greatest(1, least(coalesce((p_order->>'sla_hours')::int, 24), 72));
begin
  if coalesce(trim(p_order->>'customer'), '') = '' then raise exception 'Customer is required'; end if;
  if jsonb_array_length(items) < 1 then raise exception 'At least one item is required'; end if;

  select * into main_wh from public.warehouses where code = 'MAIN' limit 1;
  if main_wh.id is null then raise exception 'Main warehouse not found'; end if;

  select coalesce(max((regexp_replace(order_number, '[^0-9]', '', 'g'))::bigint), 10000) + 1
    into next_number from public.orders;

  insert into public.orders (order_number, customer, priority, priority_rank, status, warehouse_id, courier, shipping_service, tracking_number, pickup_window, sla_deadline, item_count)
  values (
    'ORD-' || next_number,
    trim(p_order->>'customer'),
    case when p_order->>'priority' = 'Priority' then 'Priority' else 'Normal' end,
    case when p_order->>'priority' = 'Priority' then 1 else 2 end,
    'Processing', main_wh.id,
    coalesce(nullif(p_order->>'courier',''), 'Delhivery'),
    coalesce(nullif(p_order->>'shipping_service',''), 'Standard'),
    'TRK-' || upper(substr(md5(gen_random_uuid()::text), 1, 10)),
    'Today · 4:00 PM',
    now() + make_interval(hours => sla_hours),
    0
  ) returning * into new_order;

  for item in select * from jsonb_array_elements(items) loop
    insert into public.order_items (order_id, sku, product_name, variant, quantity, picked_quantity, pick_location, warehouse_id)
    values (new_order.id, item->>'sku', item->>'product_name', coalesce(item->>'variant','Standard'), greatest(1, (item->>'quantity')::int), 0, 'A-' || floor(random()*8 + 1)::int || '-' || floor(random()*40 + 1)::int, main_wh.id);
  end loop;

  update public.orders set item_count = (select count(*) from public.order_items where order_id = new_order.id) where id = new_order.id returning * into new_order;
  return jsonb_build_object('id', new_order.id, 'order_number', new_order.order_number);
end;
$$;

grant execute on function public.create_fulfillment_order(jsonb) to anon, authenticated;

-- Server-side operation: confirm picking and move order to Packing.
create or replace function public.confirm_order_pick(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;

  if o.id is null then
    raise exception 'Order not found';
  end if;

  if o.status <> 'Picking' then
    raise exception 'Order is not in Picking state';
  end if;

  update public.order_items
  set picked_quantity = quantity
  where order_id = p_order_id;

  update public.orders
  set status = 'Packing', updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'Packing'
  );
end;
$$;

grant execute on function public.confirm_order_pick(uuid) to anon, authenticated;

-- Server-side operation: move requested stock between warehouses atomically.
create or replace function public.complete_stock_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.stock_transfers;
  source_qty int;
  target_id uuid;
begin
  select * into t from public.stock_transfers where id = p_transfer_id for update;

  if t.id is null then
    raise exception 'Transfer not found';
  end if;

  if t.status <> 'Requested' then
    raise exception 'Only Requested transfers can be completed';
  end if;

  select quantity into source_qty
  from public.inventory
  where sku = t.sku and warehouse_id = t.from_warehouse_id
  for update;

  if coalesce(source_qty, 0) < t.quantity then
    raise exception 'Insufficient source stock';
  end if;

  update public.inventory
  set quantity = quantity - t.quantity, updated_at = now()
  where sku = t.sku and warehouse_id = t.from_warehouse_id;

  select id into target_id
  from public.inventory
  where sku = t.sku and warehouse_id = t.to_warehouse_id
  for update;

  if target_id is null then
    raise exception 'Target inventory row does not exist';
  end if;

  update public.inventory
  set quantity = quantity + t.quantity, updated_at = now()
  where id = target_id;

  update public.stock_transfers
  set status = 'Completed', completed_at = now()
  where id = p_transfer_id;

  return jsonb_build_object(
    'transfer_id', p_transfer_id,
    'status', 'Completed'
  );
end;
$$;

grant execute on function public.complete_stock_transfer(uuid) to anon, authenticated;

-- Seed warehouses
insert into public.warehouses (code, name, address) values
('MAIN', 'Main Warehouse', 'XYZ Distribution Center'),
('SECONDARY', 'Secondary Warehouse', 'XYZ Overflow Warehouse');

-- Seed demo data: 360 realistic orders for a busy fulfillment day.
-- SLA deadlines are generated relative to the moment this script is run so
-- the demo never shows absurd values such as thousands of hours remaining.
do $$
declare
  main_id uuid;
  secondary_id uuid;
  i int;
  st text;
  pr text;
  cust text;
  courier_name text;
  svc text;
  sla timestamptz;
  item_qty int;
  item_sku text;
  item_name text;
  item_variant text;
  pick_loc text;
begin
  select id into main_id from public.warehouses where code = 'MAIN';
  select id into secondary_id from public.warehouses where code = 'SECONDARY';

  for i in 1..360 loop
    st := case
      when i <= 48 then 'Processing'
      when i <= 92 then 'Picking'
      when i <= 126 then 'Packing'
      when i <= 154 then 'Staged'
      else 'Shipped'
    end;

    pr := case when i % 7 in (0,1) then 'Priority' else 'Normal' end;
    cust := (array['Rahul Sharma','Ananya Verma','Rohit Patel','Priya Singh','Aarav Mehta','Neha Jain','Vivek Rao','Ishita Gupta','Karan Mehta','Sneha Joshi','Aditya Shah','Pooja Nair'])[1 + ((i-1) % 12)];
    courier_name := (array['Delhivery','Blue Dart','Ecom Express','Shiprocket'])[1 + ((i-1) % 4)];
    svc := case when pr = 'Priority' then 'Priority' else (array['Standard','Express'])[1 + (i % 2)] end;

    -- Keep every active SLA within 24 hours. Some orders are intentionally
    -- close to the deadline to demonstrate the at-risk workflow.
    sla := case
      when st <> 'Shipped' and i % 19 = 0 then now() + interval '25 minutes'
      when st <> 'Shipped' and i % 13 = 0 then now() + interval '75 minutes'
      else now() + make_interval(mins => 120 + ((i * 37) % 1320))
    end;

    insert into public.orders
      (order_number, customer, priority, priority_rank, status, warehouse_id,
       courier, shipping_service, tracking_number, pickup_window, sla_deadline, item_count, created_at, updated_at)
    values
      (10000 + i, cust, pr, case when pr='Priority' then 1 else 2 end, st, main_id,
       courier_name, svc, upper(substr(courier_name,1,2)) || (10000+i),
       case when i % 3 = 0 then 'Today · 3:30 PM' when i % 3 = 1 then 'Today · 4:00 PM' else 'Today · 5:00 PM' end,
       sla, 0, now() - make_interval(mins => (i % 480)), now());

    -- Two items per order make the picking/packing demo meaningful.
    item_sku := (array['P1001','P1002','P1003','P1004','P1005'])[1 + ((i-1) % 5)];
    item_name := case item_sku
      when 'P1001' then 'White T-Shirt'
      when 'P1002' then 'Black T-Shirt'
      when 'P1003' then 'Blue Jeans'
      when 'P1004' then 'Grey Hoodie'
      else 'Sneakers'
    end;
    item_variant := case item_sku
      when 'P1001' then 'Medium'
      when 'P1002' then 'Large'
      when 'P1003' then '32'
      when 'P1004' then 'Large'
      else 'Size 9'
    end;
    pick_loc := case item_sku
      when 'P1001' then 'Aisle A · Rack 04'
      when 'P1002' then 'Aisle B · Rack 12'
      when 'P1003' then 'Aisle A · Rack 07'
      when 'P1004' then 'Aisle D · Rack 02'
      else 'Aisle E · Rack 09'
    end;
    item_qty := 1 + (i % 3);

    insert into public.order_items (order_id, sku, product_name, variant, quantity, picked_quantity, pick_location, warehouse_id)
    select id, item_sku, item_name, item_variant, item_qty,
      case when st in ('Packing','Staged','Shipped') then item_qty else 0 end,
      pick_loc, main_id
    from public.orders where order_number = (10000 + i)::text;

    item_sku := (array['P1005','P1004','P1003','P1002','P1001'])[1 + ((i+1) % 5)];
    item_name := case item_sku
      when 'P1001' then 'White T-Shirt'
      when 'P1002' then 'Black T-Shirt'
      when 'P1003' then 'Blue Jeans'
      when 'P1004' then 'Grey Hoodie'
      else 'Sneakers'
    end;
    item_variant := case item_sku
      when 'P1001' then 'Medium'
      when 'P1002' then 'Large'
      when 'P1003' then '32'
      when 'P1004' then 'Large'
      else 'Size 9'
    end;
    pick_loc := case item_sku
      when 'P1001' then 'Aisle A · Rack 04'
      when 'P1002' then 'Aisle B · Rack 12'
      when 'P1003' then 'Aisle A · Rack 07'
      when 'P1004' then 'Aisle D · Rack 02'
      else 'Aisle E · Rack 09'
    end;
    item_qty := 1 + ((i+1) % 2);

    insert into public.order_items (order_id, sku, product_name, variant, quantity, picked_quantity, pick_location, warehouse_id)
    select id, item_sku, item_name, item_variant, item_qty,
      case when st in ('Packing','Staged','Shipped') then item_qty else 0 end,
      pick_loc, main_id
    from public.orders where order_number = (10000 + i)::text;
  end loop;
end $$;

update public.orders o
set item_count = x.cnt
from (
  select order_id, sum(quantity) cnt from public.order_items group by order_id
) x
where o.id = x.order_id;

-- Seed inventory for the main and secondary warehouses.
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1001','White T-Shirt','Medium',id,24,10,'Aisle A · Rack 04' from public.warehouses where code='MAIN';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1001','White T-Shirt','Medium',id,32,10,'Overflow · Rack 04' from public.warehouses where code='SECONDARY';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1002','Black T-Shirt','Large',id,0,8,'Aisle B · Rack 12' from public.warehouses where code='MAIN';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1002','Black T-Shirt','Large',id,18,8,'Overflow · Rack 12' from public.warehouses where code='SECONDARY';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1003','Blue Jeans','32',id,18,8,'Aisle A · Rack 07' from public.warehouses where code='MAIN';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1003','Blue Jeans','32',id,20,8,'Overflow · Rack 07' from public.warehouses where code='SECONDARY';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1004','Grey Hoodie','Large',id,14,8,'Aisle D · Rack 02' from public.warehouses where code='MAIN';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1004','Grey Hoodie','Large',id,16,8,'Overflow · Rack 02' from public.warehouses where code='SECONDARY';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1005','Sneakers','Size 9',id,10,6,'Aisle E · Rack 09' from public.warehouses where code='MAIN';
insert into public.inventory (sku, product_name, variant, warehouse_id, quantity, reorder_level, location)
select 'P1005','Sneakers','Size 9',id,22,6,'Overflow · Rack 09' from public.warehouses where code='SECONDARY';

-- Seed a few operational exceptions for the demo.
insert into public.issues (order_id, type, description, severity, owner, status) values
('10017','Inventory mismatch','Main warehouse count is lower than the system quantity for P1002.','High','Warehouse Lead','Open'),
('10039','Wrong variant','Customer order requires Medium but Large was found during picking.','Critical','Picking Lead','Open'),
('10064','Missing label','Shipping label was not available at the packing station.','Medium','Dispatch Lead','Open'),
('10112','Box misplaced','Packed carton is not present in the expected staging lane.','High','Warehouse Lead','Open'),
('10185','Courier delay','Courier pickup window has been missed by more than 20 minutes.','High','Dispatch Lead','Open'),
('10231','Damaged item','Outer packaging damaged during packing inspection.','Medium','Packing Lead','Resolved');

