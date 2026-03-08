/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@forge-code/shared-types"],
};

module.exports = nextConfig;
