/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16: NO setear `turbopack.root = __dirname`.
  // Bug conocido (vercel/next.js#90307): cuando root === project dir, Turbopack
  // resuelve `@import 'tailwindcss'` desde el directorio padre y falla con
  // "Can't resolve 'tailwindcss'". Next infiere bien la raíz si se corre desde `app/`.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
}

export default nextConfig
