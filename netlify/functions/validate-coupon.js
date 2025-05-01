export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
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

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: "No coupon code provided" })
      };
    }

    const WEBFLOW_API_TOKEN = process.env.WEBFLOW_API_TOKEN;
    const COUPONS_COLLECTION_ID = process.env.COUPONS_COLLECTION_ID;

    const webflowResponse = await fetch(
      `https://api.webflow.com/v1/collections/${COUPONS_COLLECTION_ID}/items?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    );

    const json = await webflowResponse.json();

    // Handle Webflow API error
    if (!webflowResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Webflow API Error", details: json })
      };
    }

    const coupons = json.items;

    const found = coupons.find(
      (item) => item?.fields?.name?.toUpperCase() === code
    );

    if (!found || !found.fields) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false })
      };
    }

    // Adjust this key if your field has a custom slug
    const discount = found.fields.discount;

    if (!discount || typeof discount !== "number") {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Invalid discount field in Webflow" })
      };
    }

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
      body: JSON.stringify({ error: "Server Error", details: err.message })
    };
  }
}
