import {build} from "esbuild";
import {fileURLToPath} from "node:url";
await build({entryPoints:[fileURLToPath(new URL("./radar-entry.mjs",import.meta.url))],outfile:fileURLToPath(new URL("../vendor/ec-canvas/echarts.js",import.meta.url)),bundle:true,minify:true,format:"cjs",platform:"browser",target:"es2018",legalComments:"eof"});
