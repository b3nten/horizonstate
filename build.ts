import * as esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import * as fs from "node:fs";

export let build = async (args: Partial<esbuild.BuildOptions>) => {
  await esbuild.build({
    ...args,
    entryPoints: ["src/*.ts"],
    bundle: false,
    format: "esm",
    treeShaking: true,
    target: ["es2022"],
    plugins: [dtsPlugin()],
  });
};

console.info(`Building...`);

let t = performance.now();

try {
  fs.rmSync(".prod", { recursive: true, force: true });
} catch {}
await build({
  dropLabels: ["DEV"],
  outdir: ".prod",
});

try {
  fs.rmSync(".dev", { recursive: true, force: true });
} catch {}
await build({
  dropLabels: ["PROD"],
  outdir: ".dev",
});

console.info(`Built in ${(performance.now() - t).toFixed(0)}ms`);
