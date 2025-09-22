// middlewares/uploadDocs.js
import multer from "multer";
import path from "path";
import fs from "fs";

const baseDir = process.env.UPLOAD_DIR || "public/uploads";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // create a temp folder per "session" (we will move/keep under payment id)
    const tempFolder = path.join(baseDir, "temp");
    fs.mkdirSync(tempFolder, { recursive: true });
    cb(null, tempFolder);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${ts}-${file.fieldname}${ext}`);
  },
});

export const uploadDocs = multer({ storage });
