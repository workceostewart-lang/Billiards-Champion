import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const server = resolve(dist, "server");
const metadataDir = resolve(dist, ".openai");

await mkdir(server, { recursive: true });
await mkdir(metadataDir, { recursive: true });

const worker = `export default {
  async fetch(request, env) {
    if (!env.ASSETS) return new Response("Billiards Champion asset binding is unavailable.", { status: 503 });
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const url = new URL(request.url);
    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
};\n`;

await writeFile(resolve(server, "index.js"), worker);
await copyFile(resolve(root, ".openai", "hosting.json"), resolve(metadataDir, "hosting.json"));

const manifestPath = resolve(dist, ".vite", "manifest.json");
try {
  await readFile(manifestPath, "utf8");
} catch {
  // Static builds do not require a Vite manifest.
}
