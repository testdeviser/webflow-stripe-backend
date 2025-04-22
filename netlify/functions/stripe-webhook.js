const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Decode the raw body
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8');

    // Construct the Stripe event
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    // ✅ Example: Payment succeeded
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object;
      console.log('✅ Payment succeeded:', paymentIntent);
	  
	  const pi = stripeEvent.data.object;

    const orderPayload = {
	  fieldData: {
		name: `${pi.metadata.product_name || "Order"} - ${pi.metadata.type || "purchase"}`,
		customerid: pi.customer,
		product: pi.metadata.product_name,
		amount: pi.amount / 100,
		type: pi.metadata.type,
		//email: pi.receipt_email || pi.metadata.email || "unknown",
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
      console.log("✅ Webflow CMS item created:", result);
    } catch (err) {
      console.error("❌ Failed to create Webflow item:", err.message);
    }
	  
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
