const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { buffer } = require("micro");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.config = {
  bodyParser: false
};

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.handler = async (event, context) => {
  try {
    const rawBody = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    const signature = event.headers["stripe-signature"];
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);

    if (stripeEvent.type === "payment_intent.succeeded") {
      const pi = stripeEvent.data.object;

      const orderPayload = {
        fields: {
          name: `${pi.metadata.product_name || "Order"} - ${pi.metadata.type || "purchase"}`,
          customer_id: pi.customer,
          product: pi.metadata.product_name,
          amount: pi.amount / 100,
          type: pi.metadata.type,
          email: pi.receipt_email || pi.metadata.email || "unknown",
          status: "Paid",
          date: new Date(pi.created * 1000).toISOString()
        }
      };

      const res = await fetch(
        `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_COLLECTION_ID}/items?live=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
            "Content-Type": "application/json",
            "Accept-Version": "2.0.0"
          },
          body: JSON.stringify(orderPayload)
        }
      );

      const result = await res.json();
      console.log("✅ Webflow CMS item created:", result);
    }

    return {
      statusCode: 200,
      body: "Webhook handled successfully"
    };
  } catch (err) {
    console.error("❌ Stripe Webhook Error:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }
};
