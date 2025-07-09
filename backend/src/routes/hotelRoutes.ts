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

// Basic route to list all hotels - use search with default params
router.get('/', (req, res, next) => {
  const controller = initController();
  // Set default search parameters if none provided
  if (!req.query.checkIn) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    req.query.checkIn = today.toISOString().split('T')[0];
    req.query.checkOut = tomorrow.toISOString().split('T')[0];
    req.query.guests = '2';
  }
  return controller.searchHotels(req, res, next);
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