#!/usr/bin/env bash
set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC}  $*"; }
warn() { echo -e "${YELLOW}!${NC}  $*"; }
fail() { echo -e "${RED}✗${NC}  $*"; exit 1; }

echo ""
echo "  quic-platform local setup"
echo "  ─────────────────────────"
echo ""

# ── Node version ───────────────────────────────────────────────────────────────
REQUIRED_NODE=20
CURRENT_NODE=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [[ "$CURRENT_NODE" -lt "$REQUIRED_NODE" ]]; then
  fail "Node $REQUIRED_NODE+ required (found: $CURRENT_NODE). Install via https://nodejs.org or nvm."
fi
ok "Node $(node -v)"

# ── .env.local ─────────────────────────────────────────────────────────────────
if [[ -f .env.local ]]; then
  warn ".env.local already exists — skipping copy"
else
  cp .env.example .env.local
  ok "Copied .env.example → .env.local"
  warn "Edit .env.local and fill in your Supabase, Vercel Blob, and other credentials before running 'npm run dev'"
fi

# ── Install deps ───────────────────────────────────────────────────────────────
echo ""
echo "  Installing dependencies..."
npm ci --prefer-offline 2>&1 | tail -3
ok "npm dependencies installed"

# ── Typecheck ──────────────────────────────────────────────────────────────────
echo ""
echo "  Running type check..."
if npm run typecheck --silent 2>&1; then
  ok "TypeScript clean"
else
  warn "TypeScript errors found — run 'npm run typecheck' for details"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "  Setup complete. Next steps:"
echo "  1. Edit .env.local with your credentials"
echo "  2. npm run dev"
echo "  3. (optional) node scripts/seed-demo.mjs  — seed demo data"
echo "  4. (optional) npm run db:types             — regenerate Supabase types"
echo "     Requires SUPABASE_PROJECT_ID in .env.local"
echo ""
