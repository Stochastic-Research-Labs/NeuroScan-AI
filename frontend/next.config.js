/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repository has a parent-level package-lock.json unrelated to this app.
  // Pin Turbopack's filesystem root so it does not watch that directory or warn.
  turbopack: {
    root: __dirname,
  },
  // A complete four-modality MRI study is typically larger than Next's 10 MB
  // proxy default. Keep the limit bounded, while allowing local NIfTI uploads.
  experimental: {
    proxyClientMaxBodySize: "128mb",
  },
  // NiiVue and WASM-based decoders need these headers relaxed off for local dev;
  // keep this app local-only (no external deployment).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  // Proxy the local FastAPI service through the Next.js origin. This keeps browser-side
  // volume requests same-origin (important for WebGL viewers and restrictive extensions)
  // while FastAPI continues to run independently on port 8000.
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
