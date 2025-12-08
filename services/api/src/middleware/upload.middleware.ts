import multer from 'multer';

// Store in memory (we'll handle file saving via storage service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE_MB || '500') * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    // Validate video mime types
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files allowed'));
    }
    cb(null, true);
  },
});

export const uploadSingle = upload.single('file');
