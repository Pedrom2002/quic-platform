-- Fix: stock_check_saida() (0034) reads current availability with no row
-- lock and no SERIALIZABLE isolation, so two concurrent "saida" inserts for
-- the same material can each read the same pre-commit availability, both
-- pass the check, and both commit, oversubscribing the material.
--
-- Fix: take a transaction-scoped advisory lock keyed by material_id before
-- reading availability. Concurrent inserts for the same material now
-- serialize on this lock (the second waits for the first transaction to
-- commit or roll back), so the availability read is no longer stale by the
-- time the check runs. Inserts for different materials are unaffected.

create or replace function public.stock_check_saida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disponivel int;
begin
  if new.type = 'saida' then
    perform pg_advisory_xact_lock(hashtext(new.material_id::text));

    select av.disponivel
      into v_disponivel
    from public.stock_material_availability av
    where av.material_id = new.material_id;

    if new.quantity > coalesce(v_disponivel, 0) then
      raise exception 'stock insuficiente: disponivel %', coalesce(v_disponivel, 0);
    end if;
  end if;
  return new;
end;
$$;
