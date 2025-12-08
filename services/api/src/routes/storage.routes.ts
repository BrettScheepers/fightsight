import { Router } from 'express';
import { StorageController } from '../controllers/storage.controller';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const controller = new StorageController();

// Request upload URL (authenticated)
// TODO: Add authenticate middleware when auth is implemented
router.post('/request-upload', controller.requestUploadUrl);

// Upload file with token (no auth - token-based)
router.put('/upload/:token', uploadSingle, controller.uploadFile);

// Download/access file (authenticated)
// TODO: Add authenticate middleware when auth is implemented
router.get('/files/:fileName', controller.getFile);

export default router;
