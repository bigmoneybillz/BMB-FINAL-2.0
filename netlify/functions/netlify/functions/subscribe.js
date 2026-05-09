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

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { email, firstName } = JSON.parse(event.body);

    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email' }) };
    }

    // Use Shopify's storefront customer register endpoint — no token needed
    const formData = new URLSearchParams();
    formData.append('customer[email]', email);
    formData.append('customer[first_name]', firstName || '');
    formData.append('customer[accepts_marketing]', 'true');
    formData.append('form_type', 'create_customer');
    formData.append('utf8', '✓');

    const res = await fetch('https://bmb-collective.myshopify.com/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    });

    // Shopify storefront returns 200 even for existing customers
    // We just care that it went through
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (e) {
    // Still return success — don't block the user
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  }
};
