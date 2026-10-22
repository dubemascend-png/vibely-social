import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // GitHub Pages serves project sites from /<repository-name>/.
  basePath: '/vibely-social',
  // Explicitly prefix exported JS/CSS assets for reliable loading on GitHub Pages project sites.
  assetPrefix: '/vibely-social/',
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
