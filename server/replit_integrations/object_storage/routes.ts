import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
  console.log(`Uploads directory ready: ${UPLOADS_DIR}`);
} catch (err) {
  console.error(`Warning: uploads directory issue at ${UPLOADS_DIR}:`, err);
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o755 });
    console.log(`Created uploads directory: ${UPLOADS_DIR}`);
  } catch (mkdirErr) {
    console.error(`Failed to create uploads directory:`, mkdirErr);
  }
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${randomUUID()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function registerObjectStorageRoutes(app: Express): void {
  app.post("/api/uploads/file", (req: Request, res: Response) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        console.error("Multer upload error:", err);
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: "File too large. Maximum size is 25MB." });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ error: `Upload failed: ${err.message || "Unknown error"}` });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file provided" });
        }

        const objectPath = `/objects/${req.file.filename}`;

        res.json({
          objectPath,
          metadata: {
            name: req.file.originalname,
            size: req.file.size,
            contentType: req.file.mimetype,
          },
        });
      } catch (error) {
        console.error("Error handling file upload:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    });
  });

  app.get(/^\/objects\/(.+)$/, (req, res) => {
    try {
      const filename = req.params[0];

      if (filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ error: "Invalid path" });
      }

      const filePath = path.join(UPLOADS_DIR, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });
}
