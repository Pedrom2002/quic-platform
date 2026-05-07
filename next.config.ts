import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
