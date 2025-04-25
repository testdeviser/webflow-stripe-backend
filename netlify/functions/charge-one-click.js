const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const DOWNLOAD_LINKS = {
  "The 7-Figure Meta Ads Playbook": "https://nebula-bard-3b2.notion.site/The-7-Figure-Meta-Ads-Playbook-1bd2b1d91a0281c2a754e0c20034cfd3?pvs=4",
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

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customer_id,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        customer_name: customer_name || "Customer",
        product_name: product_name || "Upsell Product",
        email: customer_email || "unknown",
        phone: customer_phone || "",
        type: "upsell_product",
      },
    });

    const normalizedProductName = (paymentIntent.metadata.product_name || "").trim();
    const download_url = DOWNLOAD_LINKS[normalizedProductName] || null;
    // Send data to external webhook (GHL)
    try {
      const ghlWebhookPayload = {
        name: paymentIntent.metadata.customer_name,
        email: paymentIntent.receipt_email || paymentIntent.metadata.email || "unknown",
        phone: paymentIntent.metadata.phone,
        product: paymentIntent.metadata.product_name,
        amount: paymentIntent.amount / 100,
        type: paymentIntent.metadata.type,
        date: new Date(paymentIntent.created * 1000).toISOString(),
        download_url: download_url,
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
    } catch (webhookErr) {
      console.error("❌ Failed to send data to GHL:", webhookErr.message);
    }

    const name = encodeURIComponent(paymentIntent.metadata.customer_name || "Customer");
    const email = encodeURIComponent(paymentIntent.metadata.email || "");
    const phone = encodeURIComponent(paymentIntent.metadata.phone || "");
    const id = encodeURIComponent(customer_id);

    const queryString = `customer_id=${id}&customer_email=${email}&customer_phone=${phone}&customer_name=${name}`;

    let redirect_url = `/thank-you?${queryString}`;
    if (amount === 2700) {
      redirect_url = `/upsell-2?${queryString}`;
    } else if (amount === 49700) {
      redirect_url = `/upsell-3?${queryString}`;
    } else if (amount === 19700) {
      redirect_url = `/thank-you?${queryString}`;
    }

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
        stack: err.stack,
      }),
    };
  }
};