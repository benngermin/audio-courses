import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          // UI component library
          'ui-vendor': ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          // Query and routing
          'query-vendor': ['@tanstack/react-query', 'wouter'],
          // Utility libraries
          'utils-vendor': ['clsx', 'tailwind-merge', 'date-fns'],
          // Audio and media
          'media-vendor': ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    sourcemap: false,
    minify: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'wouter',
      'clsx',
      'tailwind-merge',
    ],
  },
});
