import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

async function injectOgMeta(html: string, req: any): Promise<string> {
  try {
    const ogSetting = await storage.getAdminSetting("og_image_url");
    if (ogSetting?.value) {
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const fullUrl = ogSetting.value.startsWith("http") ? ogSetting.value : `${protocol}://${host}${ogSetting.value}`;
      html = html.replace(
        /(<meta\s+property="og:image"\s+content=")([^"]*)("\s*\/>)/,
        `$1${fullUrl}$3`
      );
      html = html.replace(
        /(<meta\s+name="twitter:image"\s+content=")([^"]*)("\s*\/>)/,
        `$1${fullUrl}$3`
      );
    }
  } catch (e) {}
  return html;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use("/{*path}", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");
    html = await injectOgMeta(html, req);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
