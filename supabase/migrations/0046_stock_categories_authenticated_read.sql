-- Quic Platform: leitura de categorias de stock para utilizadores autenticados (0046)
-- Segue o padrao de 0040-0045: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: stock_categories so tinha SELECT publico para 'anon' e ALL para
-- staff (is_stock_team(), role admin/manager). Um cliente autenticado normal
-- (sem ser staff) nao caia em nenhuma policy SELECT, ficando sem categorias
-- visiveis no catalogo mobile assim que fazia login. Policy aditiva, nao
-- toca nas policies de staff ja existentes.
CREATE POLICY "stock authenticated select categories" ON stock_categories
  FOR SELECT TO authenticated USING (true);
