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
    // Fetch coupons from Webflow CMS collection using fetch
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${process.env.WF_COUPONS_COLLECTION_ID}/items?live=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
          "Content-Type": "application/json",
          "Accept-Version": "2.0.0",
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch coupons: ${response.statusText}`);
    }

    const data = JSON.parse(await response.text());

    // Get the coupons from Webflow response
    const validCoupons = data.items.reduce((acc, item) => {
      const code = item.fieldData?.code;
      const discount = item.fieldData?.['discount-2'];
      if (code && discount != null) {
        // Convert discount from number (e.g., 25) to percentage (e.g., 0.25)
        acc[code.toUpperCase()] = parseFloat(discount) / 100;
      }
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
    let discountedAmount = Math.round(amount * (1 - discount));
    if (discount === 1.0) {
      discountedAmount = 0;
    }

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
