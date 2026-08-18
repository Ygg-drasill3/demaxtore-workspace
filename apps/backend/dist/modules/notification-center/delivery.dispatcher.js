import { socketBus } from "../../realtime/socket-bus.js";
import { logger } from "../../config/logger.js";
/** Fan-out Notification Center events to external delivery bridges (post-commit). */
export function scheduleNotificationChannelDeliveries(rows) {
    if (!rows.length)
        return;
    socketBus.scheduleEmit(() => {
        void (async () => {
            const [{ processWhatsAppBridgeDelivery }, { processEmailBridgeDelivery }] = await Promise.all([
                import("../whatsapp-notification-bridge/whatsapp-bridge.service.js"),
                import("../email-notification-bridge/email-bridge.service.js"),
            ]);
            for (const row of rows) {
                try {
                    await processWhatsAppBridgeDelivery(row.id);
                }
                catch (err) {
                    logger.warn({ err, notificationId: row.id }, "[NC] WhatsApp bridge delivery failed");
                }
                try {
                    await processEmailBridgeDelivery(row.id);
                }
                catch (err) {
                    logger.warn({ err, notificationId: row.id }, "[NC] Email bridge delivery failed");
                }
            }
        })();
    });
}
//# sourceMappingURL=delivery.dispatcher.js.map