-- =========================================================
-- Quic Platform — Portal Token Revocation
-- =========================================================
-- Adiciona flag de revogação ao portal de evento.
-- Quando portal_token_revoked_at não é NULL, o link do portal
-- é tratado como inválido mesmo que o JWT ainda seja válido.
-- =========================================================

ALTER TABLE events
  ADD COLUMN portal_token_revoked_at timestamptz;

COMMENT ON COLUMN events.portal_token_revoked_at IS
  'Quando definido, todos os JWT de portal emitidos para este evento são inválidos independentemente da validade do token.';
