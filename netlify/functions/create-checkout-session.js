const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { email, name } = JSON.parse(event.body);

  const customer = await stripe.customers.create({ email, name });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customer.id,
    line_items: [{ price: 'price_main_product_id', quantity: 1 }],
    success_url: `${process.env.BASE_URL}/one-click-pay?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/checkout`,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
};
