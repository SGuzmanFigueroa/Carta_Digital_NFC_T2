create extension if not exists pgcrypto;

create table if not exists public.cd4_restaurant_order_settings (
  restaurant_id uuid primary key,
  max_items_per_dish integer not null default 20 check (max_items_per_dish > 0),
  max_items_per_order integer not null default 50 check (max_items_per_order > 0),
  updated_at timestamptz not null default now(),
  check (max_items_per_order >= max_items_per_dish)
);

create table if not exists public.cd4_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null,
  table_number text not null,
  idempotency_key uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'delivered', 'cancelled')),
  estimated_time_minutes integer check (estimated_time_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  unique (restaurant_id, idempotency_key)
);

create table if not exists public.cd4_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.cd4_orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists cd4_orders_restaurant_created_idx
  on public.cd4_orders (restaurant_id, created_at desc);

create index if not exists cd4_orders_customer_id_idx
  on public.cd4_orders (customer_id);

create index if not exists cd4_orders_status_idx
  on public.cd4_orders (status, created_at desc);

create or replace function public.enforce_cd4_order_item_limits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_max_per_item integer;
  v_max_total integer;
  v_item_total integer;
  v_order_total integer;
begin
  select restaurant_id into v_restaurant_id
  from public.cd4_orders
  where id = new.order_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'La orden indicada no existe.';
  end if;

  insert into public.cd4_restaurant_order_settings (restaurant_id)
  values (v_restaurant_id)
  on conflict (restaurant_id) do nothing;

  select max_items_per_dish, max_items_per_order
    into v_max_per_item, v_max_total
  from public.cd4_restaurant_order_settings
  where restaurant_id = v_restaurant_id;

  select coalesce(sum(quantity), 0)::integer
    into v_item_total
  from public.cd4_order_items
  where order_id = new.order_id
    and product_id = new.product_id
    and (tg_op = 'INSERT' or id <> old.id);

  select coalesce(sum(quantity), 0)::integer
    into v_order_total
  from public.cd4_order_items
  where order_id = new.order_id
    and (tg_op = 'INSERT' or id <> old.id);

  if v_item_total + new.quantity > v_max_per_item then
    raise exception using errcode = '22023',
      message = format('Has alcanzado el límite máximo de %s unidades para este plato.', v_max_per_item);
  end if;

  if v_order_total + new.quantity > v_max_total then
    raise exception using errcode = '22023',
      message = format('La orden no puede superar las %s unidades en total.', v_max_total);
  end if;

  return new;
end;
$$;

drop trigger if exists cd4_order_item_limits on public.cd4_order_items;
create trigger cd4_order_item_limits
before insert or update of order_id, product_id, quantity on public.cd4_order_items
for each row execute function public.enforce_cd4_order_item_limits();

create or replace function public.get_cd4_order_limits(p_restaurant_id uuid)
returns table (max_items_per_dish integer, max_items_per_order integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select coalesce(settings.max_items_per_dish, 20), coalesce(settings.max_items_per_order, 50)
  from (select 1) as fallback
  left join public.cd4_restaurant_order_settings as settings on settings.restaurant_id = p_restaurant_id;
end;
$$;

create or replace function public.set_cd4_order_limits(
  p_restaurant_id uuid,
  p_max_items_per_dish integer,
  p_max_items_per_order integer
)
returns table (max_items_per_dish integer, max_items_per_order integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_max_items_per_dish < 1 or p_max_items_per_order < p_max_items_per_dish then
    raise exception using errcode = '22023', message = 'Los límites deben ser positivos y el total debe cubrir el máximo por plato.';
  end if;

  return query
  insert into public.cd4_restaurant_order_settings as settings
    (restaurant_id, max_items_per_dish, max_items_per_order, updated_at)
  values (p_restaurant_id, p_max_items_per_dish, p_max_items_per_order, now())
  on conflict (restaurant_id) do update
    set max_items_per_dish = excluded.max_items_per_dish,
      max_items_per_order = excluded.max_items_per_order,
        updated_at = now()
    returning settings.max_items_per_dish, settings.max_items_per_order;
end;
$$;

create or replace function public.create_cd4_order(
  p_restaurant_id uuid,
  p_table_number text,
  p_idempotency_key uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order_id uuid;
  v_item jsonb;
  v_order public.cd4_orders%rowtype;
begin
  if v_customer_id is null then
    raise exception using errcode = '42501', message = 'Inicia una sesión de comensal para crear el pedido.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = 'Agrega al menos un plato a la orden.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'Agrega al menos un plato a la orden.';
  end if;

  insert into public.cd4_orders (customer_id, restaurant_id, table_number, idempotency_key)
  values (v_customer_id, p_restaurant_id, p_table_number, p_idempotency_key)
  on conflict (restaurant_id, idempotency_key) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select * into v_order
    from public.cd4_orders
    where restaurant_id = p_restaurant_id and idempotency_key = p_idempotency_key;
    if v_order.customer_id <> v_customer_id then
      raise exception using errcode = '42501', message = 'La clave de idempotencia no pertenece a esta sesión.';
    end if;
    return jsonb_build_object(
      'id', v_order.id,
      'status', v_order.status,
      'estimated_time_minutes', v_order.estimated_time_minutes,
      'created_at', v_order.created_at
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'product_id', '') = ''
      or coalesce(v_item->>'name', '') = ''
      or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$'
      or coalesce(v_item->>'unit_price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception using errcode = '22023', message = 'Cada plato debe tener datos y cantidad válidos.';
    end if;

    insert into public.cd4_order_items (order_id, product_id, name, quantity, unit_price)
    values (
      v_order_id,
      v_item->>'product_id',
      v_item->>'name',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric
    );
  end loop;

  select * into v_order from public.cd4_orders where id = v_order_id;
  return jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'estimated_time_minutes', v_order.estimated_time_minutes,
    'created_at', v_order.created_at
  );
end;
$$;

create or replace function public.update_cd4_order(
  p_order_id uuid,
  p_status text,
  p_estimated_time_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.cd4_orders%rowtype;
begin
  if p_status not in ('pending', 'preparing', 'delivered', 'cancelled') then
    raise exception using errcode = '22023', message = 'El estado indicado no es válido.';
  end if;

  if p_estimated_time_minutes is not null and p_estimated_time_minutes not between 1 and 1440 then
    raise exception using errcode = '22023', message = 'El ETA debe estar entre 1 y 1440 minutos.';
  end if;

  update public.cd4_orders
  set status = p_status, estimated_time_minutes = p_estimated_time_minutes
  where id = p_order_id
  returning * into v_order;

  if not found then
    raise exception using errcode = 'P0002', message = 'No se encontró el pedido.';
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'estimated_time_minutes', v_order.estimated_time_minutes,
    'created_at', v_order.created_at
  );
end;
$$;

alter table public.cd4_restaurant_order_settings enable row level security;
alter table public.cd4_orders enable row level security;
alter table public.cd4_order_items enable row level security;

drop policy if exists cd4_orders_customer_select on public.cd4_orders;
create policy cd4_orders_customer_select on public.cd4_orders
for select to authenticated
using (customer_id = (select auth.uid()));

grant select (id, status, estimated_time_minutes, created_at) on public.cd4_orders to authenticated;

revoke all on function public.get_cd4_order_limits(uuid) from public, anon, authenticated;
revoke all on function public.set_cd4_order_limits(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.create_cd4_order(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.update_cd4_order(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.get_cd4_order_limits(uuid) to authenticated;
grant execute on function public.set_cd4_order_limits(uuid, integer, integer) to service_role;
grant execute on function public.create_cd4_order(uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.update_cd4_order(uuid, text, integer) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cd4_orders'
    ) then
    alter publication supabase_realtime add table public.cd4_orders;
  end if;
end;
$$;