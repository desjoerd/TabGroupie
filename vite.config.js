import { resolve } from "path";

/** @type {import('vite').UserConfig} */
export default {
  assetsInclude: "static/**/*",
  build: {
    lib: {
      entry: resolve(__dirname, "src/worker.ts"),
      name: "tabgroupie",
      fileName: "worker",
      formats: ["es"],
    },
  },
};
