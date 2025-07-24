import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port:8080,
    proxy: {
      // 代理 WebRTC WHEP 请求
      "/rtc": {
        target: "http://192.168.100.71:1985", // 你的媒体服务器地址
        changeOrigin: true, // 修改请求头的 Origin
        secure: false, // 如果是 https 目标但证书无效，设置为 false
        ws: true, // 支持 WebSocket
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      // 如果你还有其他媒体流需要代理，可以添加更多规则
      "/live": {
        target: "http://36.138.75.71:7634",
        changeOrigin: true,
        secure: false,
      }
    },
  },
});
