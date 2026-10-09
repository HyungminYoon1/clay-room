import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist/vendor", { recursive: true });
await mkdir("dist/assets/licenses", { recursive: true });
await build({
  entryPoints: ["tools/vendor-entry.js"],
  outfile: "dist/vendor/sculpt.js",
  bundle: true,
  format: "esm",
  minify: true,
  target: ["es2022"],
  legalComments: "eof",
});
await copyFile("node_modules/three/LICENSE", "dist/assets/licenses/three.txt");
console.log("Built pinned local Three.js module and license.");
