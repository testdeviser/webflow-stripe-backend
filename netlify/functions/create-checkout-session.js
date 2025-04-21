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
    const { name, email, phone, country, zip, exp_month, exp_year, payment_method_id, product, amount } = JSON.parse(event.body);


    const customer = await stripe.customers.create({ name, email });

    await stripe.paymentMethods.attach(payment_method_id, { customer: customer.id });

    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    const paymentIntent = await stripe.paymentIntents.create({
	  amount,
	  currency: "usd",
	  customer: customer.id,
	  payment_method: payment_method_id,
	  confirmation_method: "automatic",
	  metadata: {
		product_name: product,
		type: "main_product",
		phone,
		country,
		zip,
		exp_month,
		exp_year
	  },
	});

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        client_secret: paymentIntent.client_secret,
        customer_id: customer.id,
      }),
    };
  } catch (err) {
    console.error("Stripe Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
