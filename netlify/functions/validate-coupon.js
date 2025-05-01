const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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

    const code = coupon?.toUpperCase();
    if (!code || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing coupon or amount" })
      };
    }

    // Dynamically import node-fetch
    const fetch = (...args) =>
      import('node-fetch').then(({ default: fetch }) => fetch(...args));

    // Get coupons from Webflow CMS
    const response = await fetch(`https://api.webflow.com/collections/${process.env.COUPONS_COLLECTION_ID}/items`, {
      headers: {
        "Authorization": `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        "accept-version": "1.0.0"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Webflow API error", details: data })
      };
    }

    const coupons = data.items || [];
    console.log("Webflow item sample:", JSON.stringify(coupons[0], null, 2));


    // Find a matching coupon
    const found = coupons.find(item => item.name.toUpperCase() === code);

    if (!found || !found.fields.discount) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    const discount = found.fields.discount;
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
