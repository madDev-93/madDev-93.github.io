"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.lemonsqueezyWebhook = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
// Lemonsqueezy Webhook Secret - REQUIRED
// Set via: firebase functions:config:set lemonsqueezy.webhook_secret="your_secret"
const WEBHOOK_SECRET = (_a = functions.config().lemonsqueezy) === null || _a === void 0 ? void 0 : _a.webhook_secret;
/**
 * Verify Lemonsqueezy webhook signature
 * Throws error if verification fails
 */
function verifySignature(payload, signature) {
    if (!WEBHOOK_SECRET) {
        throw new Error("Webhook secret not configured");
    }
    if (!signature) {
        throw new Error("Missing signature");
    }
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        throw new Error("Invalid signature");
    }
}
/**
 * Normalize email for consistent storage/lookup
 */
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
/**
 * Handle Lemonsqueezy webhook for purchases
 *
 * Webhook URL:
 * https://us-central1-barber-blueprint.cloudfunctions.net/lemonsqueezyWebhook
 *
 * Required events to enable in Lemonsqueezy:
 * - order_created
 */
exports.lemonsqueezyWebhook = functions.https.onRequest(async (req, res) => {
    var _a;
    // Only allow POST
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-signature"];
    // Verify signature - will throw if invalid
    try {
        verifySignature(rawBody, signature);
    }
    catch (_b) {
        res.status(401).send("Unauthorized");
        return;
    }
    try {
        const { meta, data } = req.body;
        const eventName = meta === null || meta === void 0 ? void 0 : meta.event_name;
        // Handle order_created event
        if (eventName === "order_created") {
            const rawEmail = (_a = data === null || data === void 0 ? void 0 : data.attributes) === null || _a === void 0 ? void 0 : _a.user_email;
            if (!rawEmail) {
                res.status(400).send("No email provided");
                return;
            }
            const email = normalizeEmail(rawEmail);
            const orderId = data === null || data === void 0 ? void 0 : data.id;
            // Store minimal purchase data (avoid storing sensitive payment info)
            await db.collection("blueprint_purchases").doc(email).set({
                email,
                verified: true,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                orderId: orderId, // Keep for reference/support only
            });
            res.status(200).send("OK");
            return;
        }
        // Acknowledge other events without processing
        res.status(200).send("OK");
    }
    catch (_c) {
        res.status(500).send("Internal error");
    }
});
//# sourceMappingURL=index.js.map