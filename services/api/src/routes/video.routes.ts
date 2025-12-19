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

// Start analysis on a video
// TODO: Add authenticate middleware when auth is implemented
router.post('/:videoId/analyze', controller.startAnalysis);

// Get video status
// TODO: Add authenticate middleware when auth is implemented
router.get('/:videoId/status', controller.getStatus);

// Get analysis results
// TODO: Add authenticate middleware when auth is implemented
router.get('/:videoId/analysis', controller.getAnalysis);

// Delete video
// TODO: Add authenticate middleware when auth is implemented
router.delete('/:videoId', controller.deleteVideo);

export default router;
