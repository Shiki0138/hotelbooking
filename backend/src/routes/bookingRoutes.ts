import { Router } from 'express';
import { BookingController } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Defer controller instantiation
let bookingController: BookingController;

const initController = () => {
  if (!bookingController) {
    bookingController = new BookingController();
  }
  return bookingController;
};

router.use(authenticate); // All booking routes require authentication

router.post('/', (req, res, next) => {
  const controller = initController();
  return controller.createBooking(req, res, next);
});

router.get('/', (req, res, next) => {
  const controller = initController();
  return controller.getUserBookings(req, res, next);
});

router.get('/:id', (req, res, next) => {
  const controller = initController();
  return controller.getBooking(req, res, next);
});

router.post('/:id/confirm', (req, res, next) => {
  const controller = initController();
  return controller.confirmBooking(req, res, next);
});

router.post('/:id/cancel', (req, res, next) => {
  const controller = initController();
  return controller.cancelBooking(req, res, next);
});

export default router;