import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Defer controller instantiation
let authController: AuthController;

const initController = () => {
  if (!authController) {
    authController = new AuthController();
  }
  return authController;
};

router.post('/register', (req, res, next) => {
  const controller = initController();
  return controller.register(req, res, next);
});

router.post('/login', (req, res, next) => {
  const controller = initController();
  return controller.login(req, res, next);
});

export default router;