import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  serverExternalPackages: ["pdfmake"],
  outputFileTracingIncludes: {
    "/documents/[id]/export/[format]": [
      "./node_modules/pdfmake/fonts/Roboto/*.ttf",
    ],
  },
};

export default nextConfig;
