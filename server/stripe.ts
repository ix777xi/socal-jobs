import Stripe from "stripe";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { getSessionUser, requireAuth } from "./auth";

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" as any });
  console.log("[Stripe] Initialized with live key");
} else {
  console.warn("[Stripe] No STRIPE_SECRET_KEY found — subscription features disabled");
}

const PRICE_AMOUNT = 1999; // $19.99
const PRICE_CURRENCY = "usd";
const PRICE_INTERVAL = "month" as const;

// Helper: find or create a Stripe price for the subscription
let cachedPriceId: string | null = null;

async function getOrCreatePrice(): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");
  if (cachedPriceId) return cachedPriceId;

  // Search for existing active price
  const prices = await stripe.prices.list({
    active: true,
    currency: PRICE_CURRENCY,
    type: "recurring",
    limit: 100,
  });

  const match = prices.data.find(
    (p) =>
      p.unit_amount === PRICE_AMOUNT &&
      p.recurring?.interval === PRICE_INTERVAL
  );

  if (match) {
    cachedPriceId = match.id;
    return match.id;
  }

  // Create product + price
  const product = await stripe.products.create({
    name: "SoCal Jobs Pro",
    description: "Unlimited access to all job listings, alerts, saved jobs, and apply links across Southern California.",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: PRICE_AMOUNT,
    currency: PRICE_CURRENCY,
    recurring: { interval: PRICE_INTERVAL },
  });

  cachedPriceId = price.id;
  return price.id;
}

// Helper: get or create Stripe customer for a user
async function getOrCreateCustomer(userId: number, email: string): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");

  const user = storage.getUserById(userId);
  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId: String(userId) },
  });

  storage.updateUser(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

export function registerStripeRoutes(app: Express) {
  if (!stripe) {
    console.warn("[Stripe] Routes not registered — no secret key");
    return;
  }

  // Create Checkout Session for subscription
  app.post("/api/stripe/create-checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      // Already subscribed?
      if (user.subscriptionStatus === "active") {
        return res.status(400).json({ error: "You already have an active subscription" });
      }

      const customerId = await getOrCreateCustomer(user.id, user.email);
      const priceId = await getOrCreatePrice();

      // Build success/cancel URLs
      const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
      const successUrl = `${origin}/#/account?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/#/pricing`;

      const session = await stripe!.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: String(user.id) },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Checkout error:", err.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create Customer Portal session (manage subscription)
  app.post("/api/stripe/portal", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
      const session = await stripe!.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/#/account`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Portal error:", err.message);
      res.status(500).json({ error: "Failed to open billing portal" });
    }
  });

  // Verify checkout session (called after redirect back)
  app.get("/api/stripe/verify-session", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) return res.status(400).json({ error: "Missing session_id" });

      const session = await stripe!.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (session.payment_status === "paid" && session.subscription) {
        const sub = session.subscription as Stripe.Subscription;
        const user = (req as any).user;

        storage.updateUser(user.id, {
          subscriptionId: sub.id,
          subscriptionStatus: sub.status === "active" ? "active" : sub.status,
          subscriptionEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        });

        return res.json({ status: "active", subscriptionId: sub.id });
      }

      res.json({ status: session.payment_status });
    } catch (err: any) {
      console.error("[Stripe] Verify error:", err.message);
      res.status(500).json({ error: "Failed to verify session" });
    }
  });

  // Stripe Webhook (for subscription updates, cancellations, renewals)
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (webhookSecret && sig) {
        // Raw body needed for webhook verification
        // Express json middleware needs to be skipped for this route
        // For now, trust the event if no webhook secret is set
        const rawBody = (req as any).rawBody;
        if (!rawBody) {
          console.error("[Stripe] No raw body available for webhook verification");
          return res.status(400).json({ error: "No raw body" });
        }
        event = stripe!.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } else {
        // No webhook secret — parse directly (OK for initial setup)
        event = req.body as Stripe.Event;
      }
    } catch (err: any) {
      console.error("[Stripe] Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Webhook verification failed" });
    }

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        // Find user by Stripe customer ID
        // Use raw SQL since we don't have a dedicated method
        const { db } = await import("./storage");
        const { users } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        const user = db.select().from(users).where(eq(users.stripeCustomerId, customerId)).get();

        if (user) {
          const status = sub.status === "active" ? "active"
            : sub.status === "canceled" || event.type === "customer.subscription.deleted" ? "canceled"
            : sub.status;

          storage.updateUser(user.id, {
            subscriptionStatus: status,
            subscriptionEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
          console.log(`[Stripe] Updated user ${user.id} subscription: ${status}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          const { db } = await import("./storage");
          const { users } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          const user = db.select().from(users).where(eq(users.stripeCustomerId, customerId)).get();
          if (user) {
            storage.updateUser(user.id, { subscriptionStatus: "past_due" });
            console.log(`[Stripe] User ${user.id} payment failed — marked past_due`);
          }
        }
        break;
      }
    }

    res.json({ received: true });
  });
}
