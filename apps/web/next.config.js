/** @type {import("next").NextConfig} */
const apiOrigin = process.env.TEXTPLEX_API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
