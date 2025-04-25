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
    const { customer_id, amount, product_name, customer_name, customer_email, customer_phone } = JSON.parse(event.body);

    if (!customer_id || !amount) {
      throw new Error("Missing required parameters.");
    }

    // Get default payment method
    const customer = await stripe.customers.retrieve(customer_id);
    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error("No default payment method found for this customer.");
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
	  name: customer_name,
      currency: "usd",
      customer: customer_id,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        product_name: product_name || "Upsell Product",
		email : customer_email,
		phone:customer_phone,
        type: "upsell_product",
      },
    });

    // Determine redirect flow
    let redirect_url = "/thank-you";
    if (amount === 2700) redirect_url = "/upsell-2?customer_id=" + customer_id;
    else if (amount === 49700) redirect_url = "/upsell-3?customer_id=" + customer_id;
    else if (amount === 19700) redirect_url = "/thank-you?customer_id=" + customer_id;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, redirect_url }),
    };
  } catch (err) {
    console.error("Stripe One-Click Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        error: err.message || "Unknown error",
        details: err,
        stack: err.stack 
      }),
    };
  }
};
