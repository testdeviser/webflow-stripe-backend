const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const getRawBody = require('raw-body');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];

  try {
    // Parse the raw body
    const rawBody = await getRawBody(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'), {
      length: event.headers['content-length'],
      limit: '1mb',
      encoding: event.isBase64Encoded ? 'base64' : 'utf8',
    });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify signature and construct event
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    // Handle the event
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
