/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // serverComponentsExternalPackages was promoted to stable in Next.js 15
  serverExternalPackages: ["pino", "pino-pretty", "@prisma/client"],
};

export default nextConfig;
