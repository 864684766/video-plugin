import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import DefineOptions from "unplugin-vue-define-options/vite"; //这个插件可以声明vue3的组件的名称，方便打包成组件后install中可以调用从而识别组件
import dts from "vite-plugin-dts"; //生成dts文件用到
// import copyPlugin from "rollup-plugin-copy";

// console.log("哈哈大魔王", __dirname);

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: false,
    target: "esnext",
    outDir: "dist",
    lib: {
      entry: path.resolve(__dirname, "./src/main.ts"),
      name: "ZyVideoView", //全局变量的名称,cdn引用的时候会挂载到window上
      fileName: (format) => `zy-video-view.${format}.js`, // 根据格式生成文件名
      formats: ["es", "umd", "cjs"], // 指定输出格式
    },
    rollupOptions: {
      external: ["vue", "mpegts.js"], //不要把vue和mpegts.js这些依赖也打包进来
      output: {
        globals: {
          //UMD下的全局变量名称
          vue: "Vue",
          "mpegts.js": "mpegts",
        },
        exports: "named", // 使用命名导出避免警告
        // 确保 CSS 文件被正确输出
        assetFileNames: (assetInfo) => {
          // 处理 CSS 文件
          if (assetInfo.type === "asset" && assetInfo.names) {
            const name = assetInfo.names[0];
            if (name && name.endsWith(".css")) {
              return "style.css";
            }
          }
          return "[name][extname]";
        },
      },
    },
    // 确保 CSS 被提取
    cssCodeSplit: false,
  },
  plugins: [
    vue(),
    DefineOptions(),
    dts({
      rollupTypes: true,
      // tsconfigPath: path.resolve(__dirname, "./tsconfig.json"),
      // // entryRoot:'./src/components/type.d.ts',
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
    },
  },
});
