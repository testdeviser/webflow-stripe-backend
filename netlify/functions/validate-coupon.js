exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Or restrict to a specific domain
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // Handle preflight (OPTIONS) request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "OK"
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { coupon, amount } = JSON.parse(event.body);

    const validCoupons = {
      "SAVE10": 0.10,
      "SAVE20": 0.20
    };

    const code = coupon?.toUpperCase();

    if (!code || !validCoupons[code]) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    const discount = validCoupons[code];
    const discountedAmount = Math.round(amount * (1 - discount));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        discountedAmount
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};