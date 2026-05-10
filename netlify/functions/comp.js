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

  const POKETRACE_KEY = 'pc_f49d23ff406e8b7b5cbae5117ece13870267d92970d43a8d';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const { search, set } = JSON.parse(event.body);
    if (!search) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing search term' }) };

    const query = encodeURIComponent(search + (set ? ' ' + set : ''));

    // Run PokeTrace + Pokemon TCG API in parallel
    const [searchRes, tcgRes] = await Promise.all([
      fetch(
        `https://api.poketrace.com/v1/cards?search=${query}&market=US&limit=5&product_type=single`,
        { headers: { 'X-API-Key': POKETRACE_KEY } }
      ),
      fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(search)}"${set ? '+set.name:"'+encodeURIComponent(set)+'"' : ''}&pageSize=1&select=id,name,images,set`
      )
    ]);

    const searchData = await searchRes.json();
    const results = searchData.data || [];
    if (results.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No cards found for: ' + search }) };
    }

    const card = results[0];

    // Get image from Pokemon TCG API
    let image = null;
    try {
      const tcgData = await tcgRes.json();
      const tcgCard = tcgData.data?.[0];
      image = tcgCard?.images?.large || tcgCard?.images?.small || null;
    } catch(e) { /* no image, that's fine */ }

    // Get full detail from PokeTrace
    const detailRes = await fetch(
      `https://api.poketrace.com/v1/cards/${card.id}`,
      { headers: { 'X-API-Key': POKETRACE_KEY } }
    );
    const detailData = await detailRes.json();
    const d = detailData.data || card;
    const prices = d.prices || {};

    // Also try PokeTrace image fields as fallback
    if (!image) {
      image = d.image || d.imageUrl || d.image_url ||
              d.images?.large || d.images?.small ||
              card.image || card.imageUrl || null;
    }

    const ebayNM   = prices.ebay?.NEAR_MINT || {};
    const tcgNM    = prices.tcgplayer?.NEAR_MINT || {};
    const ebayLP   = prices.ebay?.LIGHTLY_PLAYED || {};
    const ebayMP   = prices.ebay?.MODERATELY_PLAYED || {};
    const ebayHP   = prices.ebay?.HEAVILY_PLAYED || {};
    const ebayDMG  = prices.ebay?.DAMAGED || {};
    const ebayPSA10 = prices.ebay?.PSA_10  || {};
    const ebayPSA9  = prices.ebay?.PSA_9   || {};
    const ebayPSA8  = prices.ebay?.PSA_8   || {};
    const ebayBGS95 = prices.ebay?.BGS_9_5 || {};
    const ebayBGS9  = prices.ebay?.BGS_9   || {};
    const ebayCGC10 = prices.ebay?.CGC_10  || {};
    const ebayCGC95 = prices.ebay?.CGC_9_5 || {};

    const nmAvg = ebayNM.avg || tcgNM.avg || 0;
    const avg30 = ebayNM.avg30d || tcgNM.avg30d || nmAvg;
    const avg7  = ebayNM.avg7d  || tcgNM.avg7d  || nmAvg;
    let trend = 'stable', trendPct = 0;
    if (avg30 > 0) {
      trendPct = ((avg7 - avg30) / avg30 * 100);
      if (trendPct >  3) trend = 'up';
      if (trendPct < -3) trend = 'down';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        card_name:    d.name + (d.cardNumber ? ' #' + d.cardNumber : ''),
        set:          d.set?.name || null,
        variant:      d.variant   || null,
        rarity:       d.rarity    || null,
        last_updated: d.lastUpdated || null,
        has_graded:   d.hasGraded || false,
        image:        image,
        raw: {
          near_mint:         { ebay: ebayNM, tcgplayer: tcgNM },
          lightly_played:    { ebay: ebayLP },
          moderately_played: { ebay: ebayMP },
          heavily_played:    { ebay: ebayHP },
          damaged:           { ebay: ebayDMG },
        },
        graded: {
          psa_10:  ebayPSA10, psa_9: ebayPSA9, psa_8: ebayPSA8,
          bgs_9_5: ebayBGS95, bgs_9: ebayBGS9,
          cgc_10:  ebayCGC10, cgc_9_5: ebayCGC95,
        },
        market_avg:       nmAvg,
        tcgplayer_recent: tcgNM.avg || null,
        ebay_recent:      ebayNM.avg || null,
        low:  Math.min(ebayNM.low||9999, tcgNM.low||9999) === 9999 ? 0 : Math.min(ebayNM.low||9999, tcgNM.low||9999),
        high: Math.max(ebayNM.high||0, tcgNM.high||0),
        num_sales:  (ebayNM.saleCount||0) + (tcgNM.saleCount||0),
        trend:      trend,
        trend_pct:  Math.round(trendPct * 10) / 10,
        all_results: results.slice(0, 5).map(function(r) {
          return { id: r.id, name: r.name, set: r.set?.name, number: r.cardNumber, image: r.image || null };
        })
      })
    };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
