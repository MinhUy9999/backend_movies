import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { Request } from "express";

const tempDir = path.join(__dirname, "..", "temp-uploads");
fs.ensureDirSync(tempDir); 

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, tempDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, fileName);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImageTypes = /jpeg|jpg|png/;
  const allowedVideoTypes = /mp4|mov|avi/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (file.fieldname === "poster" && allowedImageTypes.test(extname) && allowedImageTypes.test(mimetype)) {
    cb(null, true);
  } else if (file.fieldname === "trailer" && allowedVideoTypes.test(extname) && allowedVideoTypes.test(mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images (jpg, png, jpeg) or videos (mp4, mov, avi) are allowed."));
  }
};

export const uploadMovieFiles = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 
  }
}).fields([
  { name: "poster", maxCount: 1 },
  { name: "trailer", maxCount: 1 }
]);