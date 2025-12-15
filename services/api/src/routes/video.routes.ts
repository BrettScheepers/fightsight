import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';

const router = Router();
const controller = new VideoController();

// Get recent videos
// TODO: Add authenticate middleware when auth is implemented
router.get('/recent', controller.getRecentVideos);

// Create analysis job
// TODO: Add authenticate middleware when auth is implemented
router.post('/analyze', controller.createAnalysisJob);

// Get video status
// TODO: Add authenticate middleware when auth is implemented
router.get('/:videoId/status', controller.getStatus);

// Get analysis results
// TODO: Add authenticate middleware when auth is implemented
router.get('/:videoId/analysis', controller.getAnalysis);

export default router;
