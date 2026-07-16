-- =========================================================================
-- Fecha dois problemas de seguranca no dominio stock (pedidos de orcamento):
--
-- 1. As policies RLS "stock anon insert quote requests" / "... items" (ver
--    0034_stock_init.sql) permitiam insert direto de anon nas tabelas via
--    PostgREST, contornando por completo a RPC stock_submit_quote (rate
--    limit, validacao de items/material). So a RPC (security definer) deve
--    escrever nestas tabelas.
--
-- 2. A RPC nao validava o formato de p_email. Combinado com o problema 1,
--    permitia gravar qualquer string em stock_quote_requests.email,
--    incluindo `?cc=...&body=...`, que e depois interpolado sem escaping em
--    mailto: (lib/stock/mailto.ts e app/dashboard/stock/pedidos/[id]/page.tsx)
--    -> mailto parameter injection contra quem abre o pedido no admin.
--
-- Aplicar manualmente (SQL Editor / Management API), tal como as migracoes
-- 0034-0037: nao reaplicar via db push.
-- =========================================================================

-- 1. Remove o insert direto de anon nas tabelas de pedidos de orcamento.
-- A RPC stock_submit_quote (security definer) continua a funcionar: corre
-- com privilegios do owner da funcao, nao precisa de policy RLS para anon.
drop policy if exists "stock anon insert quote requests" on public.stock_quote_requests;
drop policy if exists "stock anon insert quote request items" on public.stock_quote_request_items;

-- 2. Valida formato de email dentro da propria RPC (nao confiar so na
-- validacao client-side/Zod da Next.js action, ja que a RPC e chamavel
-- diretamente por anon com a chave publica).
create or replace function public.stock_submit_quote(
  p_name text,
  p_email text,
  p_phone text,
  p_event_date date,
  p_message text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_qty int;
begin
  -- Validar formato de email (RFC-simplificado, suficiente para bloquear
  -- injecao de parametros mailto: como espacos, '?' e '&').
  if p_email is null or p_email !~ '^[^@\s?&%<>"''\r\n]+@[^@\s?&%<>"''\r\n]+\.[^@\s?&%<>"''\r\n]+$' then
    raise exception 'invalid_email';
  end if;

  -- Rate-limit por email: maximo 5 pedidos na ultima hora.
  if (
    select count(*)
    from public.stock_quote_requests
    where email = p_email
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limit';
  end if;

  -- Rate-limit global: trava floods com emails diferentes (50/hora).
  if (
    select count(*)
    from public.stock_quote_requests
    where created_at > now() - interval '1 hour'
  ) >= 50 then
    raise exception 'rate_limit';
  end if;

  -- Validar items: nao nulo e pelo menos 1 elemento.
  if p_items is null or jsonb_array_length(p_items) < 1 then
    raise exception 'invalid_items';
  end if;

  -- Validar cada elemento: materialId (uuid) + qty (int > 0) e material existe.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_material_id := (v_item ->> 'materialId')::uuid;
      v_qty := (v_item ->> 'qty')::int;
    exception when others then
      raise exception 'invalid_items';
    end;

    if v_material_id is null or v_qty is null or v_qty <= 0 then
      raise exception 'invalid_items';
    end if;

    if not exists (
      select 1 from public.stock_materials where id = v_material_id
    ) then
      raise exception 'invalid_items';
    end if;
  end loop;

  -- Inserir o pedido (id gerado por default).
  insert into public.stock_quote_requests (name, email, phone, event_date, message)
  values (p_name, p_email, p_phone, p_event_date, p_message)
  returning id into v_request_id;

  -- Inserir os items associados ao novo pedido.
  insert into public.stock_quote_request_items (request_id, material_id, quantity)
  select
    v_request_id,
    (elem ->> 'materialId')::uuid,
    (elem ->> 'qty')::int
  from jsonb_array_elements(p_items) as elem;

  return v_request_id;
end;
$$;

revoke execute on function public.stock_submit_quote(text, text, text, date, text, jsonb) from public;
grant execute on function public.stock_submit_quote(text, text, text, date, text, jsonb) to anon, authenticated;
