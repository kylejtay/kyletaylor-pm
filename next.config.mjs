// Static export for GitHub Pages. The deploy workflow sets PAGES_BASE_PATH
// (e.g. "/kyletaylor-pm" for a project site); leave it unset locally or on a custom domain.
const basePath = process.env.PAGES_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};
export default nextConfig;
