// apps/backend/src/modules/auth/auth.routes.ts
import { Router } from "express";
import * as c from "./auth.controller.js";
import {
  loginBurstLimiter,
  registerBurstLimiter,
  refreshBurstLimiter,
  forgotBurstLimiter,
  resetBurstLimiter,
} from "../../middleware/rate-limit.js";

const router = Router();

router.post("/login",            loginBurstLimiter, c.loginValidator,   c.login);
router.post("/register",         registerBurstLimiter, c.registerValidator, c.register);
router.post("/refresh",          refreshBurstLimiter, c.refresh);
router.post("/logout",                               c.logout);
router.get ("/me",                                   ...c.me);
router.post("/forgot-password",  forgotBurstLimiter, c.forgotValidator,  c.forgotPassword);
router.post("/reset-password",   resetBurstLimiter, c.resetValidator,   c.resetPassword);

export default router;
