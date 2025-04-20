const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "OK",
    };
  }

  try {
    const { customer_id } = JSON.parse(event.body);

    // Fetch the customer’s default payment method
    const customer = await stripe.customers.retrieve(customer_id);
    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error("No default payment method found for this customer.");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10 upsell
      currency: "usd",
      customer: customer_id,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        product_name: "Upsell - Premium Addon",
        type: "upsell_product",
      },
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Stripe 1-click Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
