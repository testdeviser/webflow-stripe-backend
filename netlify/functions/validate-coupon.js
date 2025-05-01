const WEBFLOW_API_KEY = process.env.WEBFLOW_API_TOKEN;
const WEBFLOW_SITE_ID = process.env.WEBFLOW_SITE_ID;
const COUPONS_COLLECTION_ID = process.env.COUPONS_COLLECTION_ID;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { coupon, amount } = JSON.parse(event.body);
    const code = coupon?.toUpperCase();

    // Fetch Webflow CMS data
    const response = await fetch(`https://api.webflow.com/collections/${COUPONS_COLLECTION_ID}/items`, {
      headers: {
        Authorization: `Bearer ${WEBFLOW_API_KEY}`,
        "accept-version": "1.0.0"
      }
    });

    const { items } = await response.json();

    const matched = items.find(item => item.fields.code.toUpperCase() === code);

    if (!matched) {
      return { statusCode: 200, headers, body: JSON.stringify({ valid: false }) };
    }

    const discount = matched.fields.discount;
    const discountedAmount = Math.round(amount * (1 - discount));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: true, discountedAmount })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};