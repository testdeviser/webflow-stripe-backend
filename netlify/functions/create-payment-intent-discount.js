const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { amount, coupon_code, metadata } = JSON.parse(event.body);

  const validCoupons = {
    "SAVE10": 0.10,
    "SAVE20": 0.20
  };

  let finalAmount = amount;
  let discountMessage = "";

  if (coupon_code && validCoupons[coupon_code.toUpperCase()]) {
    const discountRate = validCoupons[coupon_code.toUpperCase()];
    finalAmount = Math.floor(amount * (1 - discountRate));
    discountMessage = `Coupon ${coupon_code.toUpperCase()} applied.`;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: "usd",
      metadata: metadata || {}
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        message: discountMessage,
        amount: finalAmount
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
