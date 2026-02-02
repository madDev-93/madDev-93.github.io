import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// Lemonsqueezy Webhook Secret - REQUIRED
// Set via: firebase functions:config:set lemonsqueezy.webhook_secret="your_secret"
const WEBHOOK_SECRET = functions.config().lemonsqueezy?.webhook_secret;

/**
 * Verify Lemonsqueezy webhook signature
 * Throws error if verification fails
 */
function verifySignature(payload: string, signature: string | undefined): void {
  if (!WEBHOOK_SECRET) {
    console.error("CRITICAL: Webhook secret not configured");
    throw new Error("Webhook secret not configured");
  }

  if (!signature) {
    console.error("Missing X-Signature header");
    throw new Error("Missing signature");
  }

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      throw new Error("Invalid signature");
    }
  } catch {
    console.error("Signature verification failed");
    throw new Error("Invalid signature");
  }
}

/**
 * Normalize email for consistent storage/lookup
 */
function normalizeEmail(email: string): string {
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
export const lemonsqueezyWebhook = functions.https.onRequest(async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  // Get raw body for signature verification
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers["x-signature"] as string | undefined;

  // Verify signature - will throw if invalid
  try {
    verifySignature(rawBody, signature);
  } catch (error) {
    console.error("Webhook verification failed:", error);
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    const { meta, data } = req.body;
    const eventName = meta?.event_name;

    console.log(`Processing Lemonsqueezy event: ${eventName}`);

    // Handle order_created event
    if (eventName === "order_created") {
      const rawEmail = data?.attributes?.user_email;

      if (!rawEmail) {
        console.error("No email in order data");
        res.status(400).send("No email provided");
        return;
      }

      const email = normalizeEmail(rawEmail);
      const orderId = data?.id;

      // Store minimal purchase data (avoid storing sensitive payment info)
      await db.collection("blueprint_purchases").doc(email).set({
        email,
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        orderId: orderId, // Keep for reference/support only
      });

      console.log(`Purchase verified for: ${email}`);
      res.status(200).send("OK");
      return;
    }

    // Acknowledge other events without processing
    console.log(`Unhandled event type: ${eventName}`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Internal error");
  }
});
