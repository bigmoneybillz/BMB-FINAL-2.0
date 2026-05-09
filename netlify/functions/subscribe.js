exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const SHOPIFY_STORE   = 'bmb-collective.myshopify.com';
  const SHOPIFY_TOKEN   = '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';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { email, firstName } = JSON.parse(event.body);

    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email' }) };
    }

    const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-01/customers.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_TOKEN
      },
      body: JSON.stringify({
        customer: {
          first_name: firstName || '',
          email: email,
          email_marketing_consent: {
            state: 'subscribed',
            opt_in_level: 'single_opt_in'
          },
          tags: 'bmb-card-tool, email-gate',
          accepts_marketing: true
        }
      })
    });

    const data = await res.json();

    // 422 means customer already exists — still let them through
    if (res.status === 422) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, existing: true }) };
    }

    if (!res.ok) {
      return { statusCode: res.status, headers, body: JSON.stringify({ error: data.errors || 'Shopify error' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, customerId: data.customer?.id }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
