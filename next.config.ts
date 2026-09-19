/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./prisma/generated/**/*'],
    '/*': ['./prisma/generated/**/*'],
  },
};

export default nextConfig;