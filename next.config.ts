import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Prevents cross-origin windows from retaining a reference to this page,
  // mitigating Spectre-style side-channel attacks via shared browsing contexts.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Matches MAX_FILE_SIZE (schemas/file.schema.ts): Server Actions like
      // uploadFileAction / uploadFileToItemAction receive files via FormData,
      // so the body limit must cover a full 50 MB upload.
      bodySizeLimit: '50mb',
    },
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/portugal/scan',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/dashboard/clients',
        destination: '/dashboard/contacts',
        permanent: true,
      },
    ]
  },
}

// withSentryConfig so ativa upload de source maps quando SENTRY_AUTH_TOKEN,
// SENTRY_ORG e SENTRY_PROJECT estao definidos (ex: no build da CI). Sem eles,
// o plugin fica em no-op e o build/dev continuam normalmente.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silencia logs do upload de source maps fora de CI.
  silent: !process.env.CI,

  // Evita que o build falhe se o Sentry nao estiver configurado.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
})
