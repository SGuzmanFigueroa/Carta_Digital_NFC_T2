grant select (id, restaurant_id, table_number, status, estimated_time_minutes, created_at)
  on public.cd4_orders to authenticated;
grant update (status) on public.cd4_orders to authenticated;
grant select (id, order_id, name, quantity)
  on public.cd4_order_items to authenticated;

drop policy if exists cd4_orders_kds_select on public.cd4_orders;
create policy cd4_orders_kds_select on public.cd4_orders
for select to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'kds'
  and restaurant_id::text = (select auth.jwt() -> 'app_metadata' ->> 'restaurant_id')
);

drop policy if exists cd4_orders_kds_update on public.cd4_orders;
create policy cd4_orders_kds_update on public.cd4_orders
for update to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'kds'
  and restaurant_id::text = (select auth.jwt() -> 'app_metadata' ->> 'restaurant_id')
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'kds'
  and restaurant_id::text = (select auth.jwt() -> 'app_metadata' ->> 'restaurant_id')
);

drop policy if exists cd4_order_items_kds_select on public.cd4_order_items;
create policy cd4_order_items_kds_select on public.cd4_order_items
for select to authenticated
using (
  exists (
    select 1
    from public.cd4_orders as order_record
    where order_record.id = order_id
      and order_record.restaurant_id::text = (select auth.jwt() -> 'app_metadata' ->> 'restaurant_id')
      and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'kds'
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cd4_order_items'
    ) then
    alter publication supabase_realtime add table public.cd4_order_items;
  end if;
end;
$$;