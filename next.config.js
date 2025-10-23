/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@web-reel/recorder'],
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    // Empty config to silence warning - Turbopack handles most cases automatically
  },
  // Fallback webpack config for if needed
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Optional: Enable React Compiler for automatic optimizations
  // reactCompiler: true,
};

export default nextConfig;
