const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { name, email, payment_method_id } = JSON.parse(event.body);

    const customer = await stripe.customers.create({
      name,
      email,
      payment_method: payment_method_id,
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.id,
      line_items: [
        {
          price: "price_1RFq7DGKSLF41TDy1CUlWObV", // Replace with real Price ID
          quantity: 1,
        },
      ],
      success_url: `${process.env.BASE_URL}/one-click-pay?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/checkout`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
