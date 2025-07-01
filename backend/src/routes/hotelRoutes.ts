import { Router } from 'express';
import { HotelController } from '../controllers/hotelController';

const router = Router();

// Defer controller instantiation until after initialization
let hotelController: HotelController;

const initController = () => {
  if (!hotelController) {
    hotelController = new HotelController();
  }
  return hotelController;
};

// Basic route to list all hotels
router.get('/', (req, res, next) => {
  const controller = initController();
  return (controller.getAllHotels || controller.searchHotels)(req, res, next);
});

router.get('/search', (req, res, next) => {
  const controller = initController();
  return controller.searchHotels(req, res, next);
});

router.get('/:id', (req, res, next) => {
  const controller = initController();
  return controller.getHotel(req, res, next);
});

export default router;