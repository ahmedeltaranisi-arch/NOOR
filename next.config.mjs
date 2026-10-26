/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/hadith": ["./data/hadith-books/**/*"],
    "/hadith": ["./data/hadith-books/**/*"],
    "/hadith/[book]": ["./data/hadith-books/**/*"],
  },
};

export default nextConfig;
