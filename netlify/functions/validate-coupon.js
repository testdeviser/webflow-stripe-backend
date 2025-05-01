const fetch = require("node-fetch");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

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
    const submittedCode = coupon?.trim().toUpperCase();

    const API_TOKEN = process.env.WEBFLOW_API_TOKEN;
    const COLLECTION_ID = process.env.COUPONS_COLLECTION_ID;

    const res = await fetch(`https://api.webflow.com/collections/${COLLECTION_ID}/items?limit=100`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "accept-version": "1.0.0"
      }
    });

    const result = await res.json();

    if (!res.ok || !result.items) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to fetch coupons from Webflow", details: result })
      };
    }

    const match = result.items.find(item =>
      item.name?.trim().toUpperCase() === submittedCode
    );

    if (!match || !match["discount"] || isNaN(match["discount"])) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    const discount = parseFloat(match["discount"]);
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
