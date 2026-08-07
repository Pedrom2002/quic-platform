// Provide baseline env vars for all tests.
// Individual tests that need specific values override these in beforeEach.
const defaults: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  CRON_SECRET: 'test-cron-secret-minimum-32-chars-pad!',
  NEXT_PUBLIC_APP_URL: 'https://app.example.com',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test_token',
  GEMINI_API_KEY: 'test-gemini-api-key',
  STRIPE_SECRET_KEY: 'sk_test_dummy_key_for_tests',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_dummy_secret_for_tests',
}

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value
}
