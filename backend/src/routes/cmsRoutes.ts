import { Router } from 'express';
import { cmsController } from '../controllers/cmsController';
import { auth } from '../middleware/auth';

const router = Router();

// All CMS routes require authentication
router.use(auth);

// User Management
router.post('/users', cmsController.createCMSUser);
router.get('/users/:userId', cmsController.getCMSUser);
router.put('/users/:id', cmsController.updateCMSUser);

// Page Management
router.post('/pages', cmsController.createPage);
router.get('/pages/:hotelId/:slug', cmsController.getPage);
router.put('/pages/:id', cmsController.updatePage);
router.post('/pages/:id/publish', cmsController.publishPage);
router.get('/pages', cmsController.listPages);

// Media Management
router.post('/media', cmsController.uploadMedia);
router.get('/media', cmsController.getMediaLibrary);
router.delete('/media/:id', cmsController.deleteMedia);

// Block Management
router.post('/blocks', cmsController.createBlock);
router.get('/blocks', cmsController.getBlocks);
router.put('/blocks/:id', cmsController.updateBlock);

// Content Builder
router.get('/content/:hotelId/:slug', cmsController.getPageContent);

export default router;