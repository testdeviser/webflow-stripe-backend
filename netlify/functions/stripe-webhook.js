const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

const DOWNLOAD_LINKS = {
  "Ultimate Organic Package": "https://yourdomain.com/downloads/organic-package.zip",
  "Ultimate Ads Package": "https://yourdomain.com/downloads/ads-package.zip",
  "Ultimate Brand Scaling Package": "https://yourdomain.com/downloads/brand-scaling.zip",
  "THE 7-FIGURE META ADS PLAYBOOK": "https://yourdomain.com/downloads/7-figure-playbook.pdf",
  "5 DFY STATIC ADS DONE FOR YOU": "https://yourdomain.com/downloads/5-dfy-ads.zip",
  "10 DFY STATIC ADS DONE FOR YOU": "https://yourdomain.com/downloads/10-dfy-ads.zip",
};

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8');

    const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    if (stripeEvent.type === 'payment_intent.succeeded') {
      const pi = stripeEvent.data.object;
      console.log('✅ Payment succeeded:', pi);

      // Create item in Webflow CMS
      const orderPayload = {
        fieldData: {
          name: `${pi.metadata.product_name || "Order"} - ${pi.metadata.type || "purchase"}`,
          customerid: pi.customer,
          product: pi.metadata.product_name,
          amount: pi.amount / 100,
          type: pi.metadata.type,
          status: "Paid",
          date: new Date(pi.created * 1000).toISOString()
        }
      };

      try {
        const res = await fetch(
          `https://api.webflow.com/v2/collections/${process.env.WEBFLOW_COLLECTION_ID}/items?live=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
              "Content-Type": "application/json",
              "Accept-Version": "2.0.0",
            },
            body: JSON.stringify(orderPayload),
          }
        );

        const result = await res.json();
        console.log("✅ Webflow CMS item created:", result);
      } catch (err) {
        console.error("❌ Failed to create Webflow item:", err.message);
      }

      // Send order confirmation via GoHighLevel
      const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL; // Set this in env or hardcode

      const ghlPayload = {
        name: pi.metadata.name || 'Customer',
        email: pi.receipt_email || pi.metadata.email,
        phone: pi.metadata.phone || '',
        product: pi.metadata.product_name,
        download_url: DOWNLOAD_LINKS[pi.metadata.product_name],
        amount: pi.amount / 100
      };

      try {
        const ghlRes = await fetch(ghlWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ghlPayload),
        });

        const ghlResult = await ghlRes.json();
        console.log("✅ GHL Webhook triggered:", ghlResult);
      } catch (err) {
        console.error("❌ Failed to trigger GHL webhook:", err.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
