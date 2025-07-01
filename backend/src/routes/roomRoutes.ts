import { Router } from 'express';
import { RoomController } from '../controllers/roomController';

const router = Router();

// Defer controller instantiation
let roomController: RoomController;

const initController = () => {
  if (!roomController) {
    roomController = new RoomController();
  }
  return roomController;
};

router.get('/search', (req, res, next) => {
  const controller = initController();
  return controller.searchRooms(req, res, next);
});

router.get('/:id', (req, res, next) => {
  const controller = initController();
  return controller.getRoom(req, res, next);
});

router.get('/:id/price-breakdown', (req, res, next) => {
  const controller = initController();
  return controller.getPriceBreakdown(req, res, next);
});

export default router;