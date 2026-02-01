import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Lemonsqueezy Webhook Secret - set this in Firebase config
// firebase functions:config:set lemonsqueezy.webhook_secret="your_secret"
const WEBHOOK_SECRET = functions.config().lemonsqueezy?.webhook_secret || "";

/**
 * Verify Lemonsqueezy webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("No webhook secret configured - skipping verification");
    return true;
  }

  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Handle Lemonsqueezy webhook for purchases
 *
 * Lemonsqueezy will POST to this endpoint when:
 * - order_created: A new order is placed
 * - subscription_created: A new subscription is created
 *
 * Set your webhook URL in Lemonsqueezy dashboard to:
 * https://us-central1-qwota-ai-coach.cloudfunctions.net/lemonsqueezyWebhook
 */
export const lemonsqueezyWebhook = functions.https.onRequest(async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  // Get signature from headers
  const signature = req.headers["x-signature"] as string;

  // Verify signature (if configured)
  if (WEBHOOK_SECRET && !verifySignature(JSON.stringify(req.body), signature)) {
    console.error("Invalid webhook signature");
    res.status(401).send("Invalid signature");
    return;
  }

  try {
    const { meta, data } = req.body;
    const eventName = meta?.event_name;

    console.log(`Received Lemonsqueezy event: ${eventName}`);

    // Handle order_created event
    if (eventName === "order_created") {
      const email = data?.attributes?.user_email?.toLowerCase();
      const orderId = data?.id;
      const productName = data?.attributes?.first_order_item?.product_name;
      const total = data?.attributes?.total_formatted;

      if (!email) {
        console.error("No email in order data");
        res.status(400).send("No email provided");
        return;
      }

      // Store purchase in Firestore
      await db.collection("blueprint_purchases").doc(email).set({
        email,
        orderId,
        productName,
        total,
        purchased: true,
        purchaseDate: new Date().toISOString(),
        source: "lemonsqueezy",
        webhookData: data?.attributes,
      });

      console.log(`Purchase recorded for: ${email}`);
      res.status(200).send("OK");
      return;
    }

    // Handle other events as needed
    console.log(`Unhandled event type: ${eventName}`);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal error");
  }
});
