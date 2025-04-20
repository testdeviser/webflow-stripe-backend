const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { session_id } = JSON.parse(event.body);
  const session = await stripe.checkout.sessions.retrieve(session_id);

  const customer = session.customer;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000, // $10 in cents
    currency: 'usd',
    customer,
    off_session: true,
    confirm: true,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
