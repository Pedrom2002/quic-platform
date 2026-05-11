-- =========================================================
-- Quic Platform — Audit Log
-- =========================================================
-- Persiste entradas de auditoria escritas por lib/audit.ts.
-- Apenas o service_role tem acesso — sem políticas RLS para
-- utilizadores autenticados.
-- =========================================================

CREATE TABLE audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action          text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_action     ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Bloqueia acesso directo por utilizadores autenticados.
-- Escrita feita exclusivamente pelo admin client (service_role).
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
