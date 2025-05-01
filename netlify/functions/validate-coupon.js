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
    const couponitems =  { coupon, amount } = JSON.parse(event.body);

    const res = await fetch( `https://api.webflow.com/collections/${process.env.COUPONS_COLLECTION_ID}/items`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
          "Content-Type": "application/json",
          "Accept-Version": "2.0.0",
        },
        body: JSON.stringify(couponitems),
      }
    );

    const responseText = await res.text();
    console.log("Full Webflow Response:", responseText);


    if (!res.ok) {
      throw new Error('Error fetching coupons from Webflow');
    }

    const data = await res.json();
    const coupons = data.items;

    const validCoupon = coupons.find(couponItem => couponItem.name.toUpperCase() === coupon?.toUpperCase());

    if (!validCoupon) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    const discount = validCoupon.discount || 0;
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