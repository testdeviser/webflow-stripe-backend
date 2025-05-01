exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", 
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

    // Fetch coupons dynamically from Webflow CMS
    const webflowAPIKey = process.env.WEBFLOW_API_TOKEN;
    const collectionId = process.env.COUPONS_COLLECTION_ID;
    
    // Fetch coupons from Webflow CMS collection using fetch
    const response = await fetch(`https://api.webflow.com/collections/${collectionId}/items`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${webflowAPIKey}`,
        'accept-version': '1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch coupons from Webflow');
    }

    const data = await response.json();

    // Get the coupons from Webflow response
    const validCoupons = data.items.reduce((acc, item) => {
      // Assuming your Webflow CMS has fields `coupon_code` and `discount`
      acc[item.coupon_code] = parseFloat(item.discount);
      return acc;
    }, {});

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
