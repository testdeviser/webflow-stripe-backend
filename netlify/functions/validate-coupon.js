const WEBFLOW_API_KEY = process.env.WEBFLOW_API_TOKEN;
const COUPONS_COLLECTION_ID = process.env.COUPONS_COLLECTION_ID;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // Debug: Log incoming request
    console.log("Incoming request body:", event.body);

    const { coupon, amount } = JSON.parse(event.body || "{}");
    if (!coupon || typeof amount !== "number") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid input" }),
      };
    }

    const code = coupon.trim().toUpperCase();

    // Fetch coupons from Webflow CMS
    const response = await fetch(
      `https://api.webflow.com/collections/${COUPONS_COLLECTION_ID}/items`,
      {
        headers: {
          Authorization: `Bearer ${WEBFLOW_API_KEY}`,
          "accept-version": "1.0.0",
        },
      }
    );

    const raw = await response.text();
    console.log("Raw Webflow response:", raw);

    const { items } = JSON.parse(raw);
    if (!items || !Array.isArray(items)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to retrieve coupons" }),
      };
    }

    // Debug: Check what's inside items
    console.log("Fetched coupons:", items.map(i => i.fields.code));

    // Find matching coupon
    const matched = items.find((item) => {
      const itemCode = item.fields?.code?.toUpperCase();
      return itemCode === code;
    });

    if (!matched) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false }),
      };
    }

    const discount = matched.fields?.discount;
    if (typeof discount !== "number") {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Invalid discount format in CMS" }),
      };
    }

    const discountedAmount = Math.round(amount * (1 - discount));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        discountedAmount,
      }),
    };
  } catch (err) {
    console.error("Error validating coupon:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server error",
        details: err.message,
      }),
    };
  }
};
