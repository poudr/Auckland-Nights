import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${randomUUID()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function registerObjectStorageRoutes(app: Express): void {
  app.post("/api/uploads/file", upload.single("file"), (req, res) => {
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
