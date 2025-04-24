exports.handler = async (event) => {
  const { coupon_code, amount } = JSON.parse(event.body);

  const validCoupons = {
    "SAVE10": 0.10,
    "SAVE20": 0.20
  };

  const code = coupon_code?.toUpperCase();
  if (!code || !validCoupons[code]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid or expired coupon code." })
    };
  }

  const discountRate = validCoupons[code];
  const newAmount = Math.floor(amount * (1 - discountRate));
  const message = `Coupon ${code} applied. You saved $${((amount - newAmount) / 100).toFixed(2)}!`;

  return {
    statusCode: 200,
    body: JSON.stringify({
      new_amount: newAmount,
      discount_message: message
    })
  };
};
