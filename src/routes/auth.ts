import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', AuthController.registerValidation, authController.register.bind(authController));
router.post('/login', AuthController.loginValidation, authController.login.bind(authController));
router.post('/refresh-token', AuthController.refreshTokenValidation, authController.refreshToken.bind(authController));
router.post('/forgot-password', AuthController.forgotPasswordValidation, authController.forgotPassword.bind(authController));
router.post('/reset-password', AuthController.resetPasswordValidation, authController.resetPassword.bind(authController));
router.post('/logout', authController.logout.bind(authController)); // Moved to public routes

// Protected routes
router.get('/me', authenticate, authController.me.bind(authController));
router.post('/change-password', authenticate, AuthController.changePasswordValidation, authController.changePassword.bind(authController));

export default router;

