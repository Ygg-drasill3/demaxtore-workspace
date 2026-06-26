// apps/backend/src/modules/health/version.routes.ts
import { Router } from "express";
import { getBuildInfo } from "../../lib/build-info.js";

const router = Router();

router.get("/", (_req, res) => {
  const info = getBuildInfo();
  res.status(200).json({
    service: "demaxtore-backend",
    version: process.env.npm_package_version ?? "0.2.0",
    commitSha: info.commitSha,
    branch: info.branch,
    buildTime: info.buildTime,
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
});

export default router;
