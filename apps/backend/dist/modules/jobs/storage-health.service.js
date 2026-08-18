import fs from "node:fs/promises";
import path from "node:path";
export class StorageHealthService {
    db;
    constructor(db) {
        this.db = db;
    }
    async scan() {
        const { env } = await import("../../config/env.js");
        const { resolveStorageProvider } = await import("../../lib/storage-provider.js");
        const provider = resolveStorageProvider();
        let accessible = false;
        let storageDir = env.STORAGE_DIR;
        if (provider.name === "s3") {
            storageDir = `s3://${env.S3_BUCKET ?? "unset"}`;
            try {
                const { HeadBucketCommand, S3Client } = await import("@aws-sdk/client-s3");
                const client = new S3Client({
                    region: env.S3_REGION,
                    credentials: env.AWS_ACCESS_KEY_ID
                        ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "" }
                        : undefined,
                });
                if (env.S3_BUCKET) {
                    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
                    accessible = true;
                }
            }
            catch {
                accessible = false;
            }
        }
        else {
            storageDir = path.resolve(env.STORAGE_DIR);
            try {
                await fs.access(storageDir);
                accessible = true;
            }
            catch {
                accessible = false;
            }
        }
        const refs = [];
        const [rfqAtt, orderDoc, shipDoc, commAtt] = await Promise.all([
            this.db.rfqAttachment.findMany({ select: { id: true, storageKey: true }, take: 30 }),
            this.db.orderDocument.findMany({ select: { id: true, storageKey: true }, take: 20 }),
            this.db.shipmentDocument.findMany({ select: { id: true, storageKey: true }, take: 20 }),
            this.db.workspaceMessageAttachment.findMany({
                select: { id: true, storageKey: true },
                take: 20,
            }),
        ]);
        for (const a of rfqAtt)
            refs.push({ kind: "rfq_attachment", id: a.id, storageKey: a.storageKey });
        for (const a of orderDoc)
            refs.push({ kind: "order_document", id: a.id, storageKey: a.storageKey });
        for (const a of shipDoc)
            refs.push({ kind: "shipment_document", id: a.id, storageKey: a.storageKey });
        for (const a of commAtt)
            refs.push({ kind: "comm_attachment", id: a.id, storageKey: a.storageKey });
        let missingFiles = 0;
        let brokenReferences = 0;
        const samples = [];
        for (const ref of refs.slice(0, 50)) {
            if (!ref.storageKey?.trim()) {
                brokenReferences++;
                samples.push({ ...ref, ok: false });
                continue;
            }
            const full = provider.name === "local"
                ? path.join(storageDir, ref.storageKey)
                : ref.storageKey;
            let ok = false;
            if (accessible && provider.name === "local") {
                try {
                    await fs.access(full);
                    ok = true;
                }
                catch {
                    missingFiles++;
                }
            }
            else if (accessible && provider.name === "s3") {
                ok = true;
            }
            samples.push({ ...ref, ok });
        }
        const totalReferences = (await this.db.rfqAttachment.count()) +
            (await this.db.orderDocument.count()) +
            (await this.db.shipmentDocument.count()) +
            (await this.db.workspaceMessageAttachment.count());
        return {
            storageDir,
            accessible,
            totalReferences,
            missingFiles,
            brokenReferences,
            driftDetected: missingFiles > 0 || brokenReferences > 0 || !accessible,
            samples,
        };
    }
    async componentHealth() {
        const report = await this.scan();
        if (!report.accessible) {
            return {
                key: "storage",
                label: "Storage Health",
                status: "down",
                detail: `Storage dir not accessible: ${report.storageDir}`,
            };
        }
        if (report.driftDetected) {
            return {
                key: "storage",
                label: "Storage Health",
                status: "degraded",
                detail: `${report.missingFiles} missing, ${report.brokenReferences} broken refs (sampled)`,
            };
        }
        return { key: "storage", label: "Storage Health", status: "up" };
    }
}
//# sourceMappingURL=storage-health.service.js.map