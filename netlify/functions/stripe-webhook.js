const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Map Stripe product names to Webflow Product IDs
const PRODUCT_MAP = {
  "Ultimate Organic Package": "67ff6da175469b4eabe08aed",
  "Ultimate Ads Package": "67fe1588c737ed6e1c818578",
  "Ultimate Brand Scaling Package": "67fe14db4bf7ef688cf2d9ab",
  "THE 7-FIGURE META ADS PLAYBOOK": "67fdfdf7e92c61467c85d304",
  "5 DFY STATIC ADS DONE FOR YOU": "67fdfd2cdedb2affbe27664d",
  "10 DFY STATIC ADS DONE FOR YOU": "67fdfc9227b300e7c3dd77c0",
};

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body, "utf8");

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    if (stripeEvent.type === "payment_intent.succeeded") {
      const pi = stripeEvent.data.object;

      const productName = pi.metadata.product_name;
      const productId = PRODUCT_MAP[productName];

      if (!productId) {
        console.error("❌ Unrecognized product:", productName);
        return {
          statusCode: 400,
          body: `Unknown product: ${productName}`,
        };
      }

      const orderPayload = {
        order: {
          email: pi.receipt_email || pi.metadata.email || "customer@unknown.com",
          shippingAddress: {
            firstName: pi.metadata.name || "Customer",
            phoneNumber: pi.metadata.phone || "N/A",
            country: pi.metadata.country || "US",
            postalCode: pi.metadata.zip || "",
          },
          products: [
            {
              productId,
              quantity: 1,
            },
          ],
          status: "unfulfilled",
          paymentStatus: "paid",
        },
      };

      try {
        const res = await fetch(
          `https://api.webflow.com/v2/sites/${process.env.WEBFLOW_SITE_ID}/orders`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
              "Content-Type": "application/json",
              "Accept-Version": "2.0.0",
            },
            body: JSON.stringify(orderPayload),
          }
        );

        const result = await res.json();
        console.log("✅ Webflow order created:", result);
      } catch (err) {
        console.error("❌ Failed to create Webflow order:", err.message);
      }
    }

    return {
      statusCode: 200,
      body: "Webhook processed",
    };
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
