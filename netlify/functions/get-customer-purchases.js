const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const customer_id = event.queryStringParameters.customer_id;

  const payments = await stripe.paymentIntents.list({
    customer: customer_id,
    limit: 10,
  });

  const purchases = payments.data.map((pi) => ({
    product: pi.metadata.product_name,
    amount: pi.amount / 100,
    type: pi.metadata.type,
    date: new Date(pi.created * 1000).toLocaleDateString(),
  }));

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(purchases),
  };
};
