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
