const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const DOWNLOAD_LINKS = {
  "Ultimate Organic Package": "https://www.notion.so/Ultimate-Organic-Post-Swipe-File-1c02b1d91a02802ea91cd44745b72e6c?pvs=4",
  "Ultimate Ads Package": "https://www.notion.so/Ultimate-Ads-Package-Swipe-File-1c02b1d91a0280f78300d81843a4cb77?pvs=4",
  "Ultimate Brand Scaling Package": "https://nebula-bard-3b2.notion.site/Ultimate-Brand-Scaling-Static-Ad-Swipe-File-1bd2b1d91a028189966cd5d6d9d98643?pvs=4",
  "THE 7-FIGURE META ADS PLAYBOOK": "https://nebula-bard-3b2.notion.site/The-7-Figure-Meta-Ads-Playbook-1bd2b1d91a0281c2a754e0c20034cfd3?pvs=4",
  //"5 DFY STATIC ADS DONE FOR YOU": "https://yourdomain.com/downloads/5-dfy-ads.zip",
  //"10 DFY STATIC ADS DONE FOR YOU": "https://yourdomain.com/downloads/10-dfy-ads.zip",
};


exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "OK",
    };
  }

try {
  const ghlWebhookPayload = {
    name: pi.metadata.customer_name || 'Customer',
    email: pi.receipt_email || pi.metadata.email || "unknown",
    phone:pi.metadata.phone,
    product: pi.metadata.product_name,
    amount: pi.amount / 100,
    type: pi.metadata.type,
    // download_url: pi.metadata.download_url, // Make sure this is passed in Stripe metadata
      date: new Date(pi.created * 1000).toISOString(),
      download_url: DOWNLOAD_LINKS[pi.metadata.product_name],
  };

  const ghlRes = await fetch(process.env.GHL_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ghlWebhookPayload)
  });

  const ghlResult = await ghlRes.text();
  console.log("✅ Sent data to GHL:", ghlResult);
  console.log(DOWNLOAD_LINKS[pi.metadata.product_name]);
  } catch (err) {
    console.error("❌ Failed to send data to GHL:", err.message);
  }
  try {
    const { customer_id, amount, product_name, customer_name, customer_email, customer_phone } = JSON.parse(event.body);

    if (!customer_id || !amount) {
      throw new Error("Missing required parameters.");
    }

    // Get default payment method
    const customer = await stripe.customers.retrieve(customer_id);
    const defaultPaymentMethod = customer.invoice_settings.default_payment_method;

    if (!defaultPaymentMethod) {
      throw new Error("No default payment method found for this customer.");
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
	    name: customer_name,
      currency: "usd",
      customer: customer_id,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        product_name: product_name || "Upsell Product",
		    email : customer_email,
		    phone:customer_phone,
        type: "upsell_product",
      },
    });
    
    // Determine redirect flow
    let redirect_url = "/thank-you";
    if (amount === 2700) redirect_url = "/upsell-2?customer_id=" + customer_id;
    else if (amount === 49700) redirect_url = "/upsell-3?customer_id=" + customer_id;
    else if (amount === 19700) redirect_url = "/thank-you?customer_id=" + customer_id;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, redirect_url }),
    };
  } catch (err) {
    console.error("Stripe One-Click Error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        error: err.message || "Unknown error",
        details: err,
        stack: err.stack 
      }),
    };
  }
};
