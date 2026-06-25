import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredBaseUrl = (env.VITE_API_BASE_URL || "").trim();
  const fallbackProxyTarget = (() => {
    if (!configuredBaseUrl) return "http://localhost:5558";
    try {
      return new URL(configuredBaseUrl).origin;
    } catch {
      return "http://localhost:5558";
    }
  })();
  const devProxyTarget = (env.VITE_PROXY_TARGET_DEV || "").trim() || fallbackProxyTarget;
  const apiBasePath = env.VITE_API_BASE_PATH || "/api/v1/kan";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      cors: true,
      proxy: {
        [apiBasePath]: {
          target: devProxyTarget,
          changeOrigin: true,
          secure: devProxyTarget.startsWith("https://"),
          cookieDomainRewrite: "",
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error("Proxy error:", err.message);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log("Proxying:", req.method, req.url, "->", proxyReq.path);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("Proxy response:", proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
  };
});
