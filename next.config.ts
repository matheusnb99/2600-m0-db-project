import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Emit a self-contained server (.next/standalone/server.js) so the Docker
  // runner stage can ship a minimal image without node_modules / the full repo.
  output: "standalone",
};

export default nextConfig;
