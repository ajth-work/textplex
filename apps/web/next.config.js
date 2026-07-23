/** @type {import("next").NextConfig} */
const path = require("node:path");
const apiOrigin = process.env.TEXTPLEX_API_ORIGIN ?? "http://127.0.0.1:8201";
const basePath = process.env.NEXT_PUBLIC_TEXTPLEX_BASE_PATH?.trim() || undefined;
const isStaticSite = process.env.TEXTPLEX_SITE_MODE === "static";

const nextConfig = {
  poweredByHeader: false,
  output: isStaticSite ? "export" : undefined,
  trailingSlash: isStaticSite,
  basePath,
  assetPrefix: basePath || undefined,
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  images: {
    unoptimized: isStaticSite,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; connect-src 'self' http: https://*.supabase.co; img-src 'self' data: blob: http: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

if (!isStaticSite) {
  nextConfig.rewrites = async () => [
    {
      source: "/api/:path*",
      destination: `${apiOrigin}/:path*`,
    },
  ];
}

module.exports = nextConfig;
