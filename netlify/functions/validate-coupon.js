const fetch = require("node-fetch");

const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
const COLLECTION_ID = process.env.COUPONS_COLLECTION_ID;


const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const fetchCoupons = async () => {
  const response = await fetch(`https://api.webflow.com/collections/${COLLECTION_ID}/items`, {
    headers: {
      Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
      "Accept-Version": "1.0.0"
    }
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || "Failed to fetch coupons");
  }

  return json.items.map(item => ({
    code: item.code.toUpperCase(),
    discount: parseFloat(item.discount),
    active: item.active
  }));
};

exports.handler = async (event) => {
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

    if (!coupon || typeof amount !== "number") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid input" })
      };
    }

    const coupons = await fetchCoupons();
    const match = coupons.find(c => c.code === coupon.toUpperCase() && c.active);

    if (!match) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    const discountedAmount = Math.round(amount * (1 - match.discount));

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
