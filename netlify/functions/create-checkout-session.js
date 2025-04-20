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
    const { name, email, payment_method_id, product, amount } = JSON.parse(event.body);

    const customer = await stripe.customers.create({ name, email });

    // Step 1: Attach payment method
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: customer.id,
    });

    // Step 2: Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    // Step 3: Create + confirm payment intent (cards only)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      customer: customer.id,
      payment_method: payment_method_id,
      confirm: true,
      confirmation_method: "automatic", // 🔒 safely confirm for card
      metadata: {
        product_name: product,
        type: "main_product",
      },
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        customer_id: customer.id,
        product,
        amount,
      }),
    };
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
