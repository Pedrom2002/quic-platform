import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
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

export default nextConfig
