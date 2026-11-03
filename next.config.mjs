/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serve the Firebase auth handler from our own domain so the Google
  // sign-in popup shows lazarophstore.com instead of firebaseapp.com.
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://lazaroph-v2.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
