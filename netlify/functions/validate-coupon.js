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
    console.log(response); 
    console.log('New Response');
    
    if (!response.ok) {
      console.log('Failed to fetch coupons:', response.statusText);
      throw new Error(`Failed to fetch coupons: ${response.statusText}`);
    }

    const rawText = await response.text();
    console.log('Raw Response:', rawText);
    const data = JSON.parse(rawText);

    // Get the coupons from Webflow response
    const validCoupons = data.items.reduce((acc, item) => {
      if (item.fields?.coupon_code && item.fields?.discount) {
        acc[item.fields.coupon_code.toUpperCase()] = parseFloat(item.fields.discount);
      }
      return acc;
    }, {});
    

    console.log('Valid Coupons:', validCoupons);

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
