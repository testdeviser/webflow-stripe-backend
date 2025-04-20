const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "payment_intent.succeeded") {
    const paymentIntent = stripeEvent.data.object;
    console.log("✅ Payment received:", {
      email: paymentIntent.receipt_email,
      customer: paymentIntent.customer,
      product: paymentIntent.metadata.product_name,
      type: paymentIntent.metadata.type,
      amount: paymentIntent.amount,
    });

    // You could save this to a DB or Netlify DB (or Zapier, Airtable, etc.)
  }

  return {
    statusCode: 200,
    body: "Webhook received",
  };
};
