/** @type {import("next").NextConfig} */
const apiOrigin = process.env.TEXTPLEX_API_ORIGIN ?? "http://127.0.0.1:8000";
const basePath = process.env.NEXT_PUBLIC_TEXTPLEX_BASE_PATH?.trim() || undefined;
const isStaticSite = process.env.TEXTPLEX_SITE_MODE === "static";

const nextConfig = {
  output: isStaticSite ? "export" : undefined,
  trailingSlash: isStaticSite,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: isStaticSite,
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
