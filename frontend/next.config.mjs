import nextConstants from 'next/constants.js'

const { PHASE_DEVELOPMENT_SERVER } = nextConstants
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Django routes require trailing slashes. Explicit API rewrites prevent
  // Django's APPEND_SLASH redirect from being sent back through Next forever.
  trailingSlash: true,

  async rewrites() {
    const djangoRoutes = [
      '/api/:path*',
      '/accounts/:path*',
      '/comment/:path*',
      '/interactions/:path*',
      '/admin/:path*',
      '/ckeditor5/:path*',
    ]
    const staticRoutes = [
      '/media/:path*',
      '/static/django_ckeditor_5/:path*',
      '/static/unfold/:path*',
      '/static/admin_library/:path*',
      '/static/user_auth/:path*',
      '/static/admin/:path*',
    ]

    return [
      // allauth's API deliberately omits the trailing slash; Next's public URL
      // keeps it, while the proxy strips only this final separator.
      { source: '/_allauth/:path*/', destination: `${backendUrl}/_allauth/:path*` },
      ...djangoRoutes.map((source) => ({ source, destination: `${backendUrl}${source}/` })),
      ...staticRoutes.map((source) => ({ source, destination: backendUrl + source })),
    ]
  },
}

export default function configureNext(phase) {
  const development = phase === PHASE_DEVELOPMENT_SERVER
  return {
    ...nextConfig,
    // Running a production check must not replace a live dev server's chunks.
    distDir: development ? '.next-dev' : '.next-build',
    typescript: { tsconfigPath: development ? 'tsconfig.dev.json' : 'tsconfig.build.json' },
  }
}
