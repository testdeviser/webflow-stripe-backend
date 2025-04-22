const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const fetch = require("node-fetch");

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

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

    try {
      const res = await fetch(
        `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_COLLECTION_ID}/items?live=true`,
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
      console.log("✅ Webflow v2 CMS item created:", result);
    } catch (err) {
      console.error("❌ Webflow v2 item creation failed:", err.message);
    }
  } 

  return {
    statusCode: 200,
    body: "Webhook handled (v2)",
  };
};
