// apps/backend/src/app.ts
// Express app builder — split from server.ts so supertest can import it.
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { corsOrigins, env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";
import { requestContext } from "./middleware/request-context.js";
import { apiGlobalLimiter, webhookLimiter, rfqMutationLimiter, } from "./middleware/rate-limit.js";
import apiRouter from "./routes.js";
import { paymentWebhookRouter } from "./modules/payments/payment.webhook.routes.js";
import { carrierWebhookRouter } from "./modules/tracking/webhook.routes.js";
import { whatsappWebhookRouter } from "./modules/chat/whatsapp.webhook.routes.js";
export function buildApp() {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", true);
    app.use(requestContext);
    // ── Security & parsers ────────────────────────────────────────────────────
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors({
        origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
        credentials: true,
    }));
    // Raw body webhooks (before JSON parser) — rate limited
    app.use("/api/payments/webhook", webhookLimiter, express.raw({ type: "application/json" }), paymentWebhookRouter);
    app.use("/api/webhooks/carrier", webhookLimiter, express.raw({ type: "application/json" }), carrierWebhookRouter);
    app.use("/api/webhooks/whatsapp", webhookLimiter, express.raw({ type: "application/json" }), whatsappWebhookRouter);
    app.use(express.json({ limit: "2mb" }));
    app.use(cookieParser());
    // ── Request logging ───────────────────────────────────────────────────────
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined", {
        stream: { write: (msg) => logger.info(msg.trim()) },
    }));
    // ── Global rate limits ────────────────────────────────────────────────────
    app.use("/api/rfq", rfqMutationLimiter);
    app.use("/api", apiGlobalLimiter);
    // ── Routes ────────────────────────────────────────────────────────────────
    app.use("/api", apiRouter);
    // ── 404 + error ───────────────────────────────────────────────────────────
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map