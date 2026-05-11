exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const POKETRACE_KEY = 'pc_f49d23ff406e8b7b5cbae5117ece13870267d92970d43a8d';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  // Complete map of PokeTrace set slugs to Scrydex set codes
  const SET_MAP = {
    // Base Era
    'base-set': 'BASE', 'jungle': 'JUN', 'fossil': 'FOS', 'base-set-2': 'B2',
    'team-rocket': 'TR', 'gym-heroes': 'GH', 'gym-challenge': 'GC',
    // Neo Era
    'neo-genesis': 'NG', 'neo-discovery': 'ND', 'neo-revelation': 'NR', 'neo-destiny': 'NDE',
    // E-Card Era
    'legendary-collection': 'LC', 'expedition': 'EXP', 'aquapolis': 'AQ', 'skyridge': 'SK',
    // EX Era
    'ruby-sapphire': 'RS', 'sandstorm': 'SS', 'dragon': 'DR',
    'team-magma-vs-team-aqua': 'MA', 'hidden-legends': 'HL',
    'firered-leafgreen': 'FL', 'team-rocket-returns': 'TRR',
    'deoxys': 'DX', 'emerald': 'EM', 'unseen-forces': 'UF',
    'delta-species': 'DS', 'legend-maker': 'LM', 'holon-phantoms': 'HP',
    'crystal-guardians': 'CG', 'dragon-frontiers': 'DF', 'power-keepers': 'PK',
    // Diamond & Pearl Era
    'diamond-pearl': 'DP', 'mysterious-treasures': 'MT', 'secret-wonders': 'SW',
    'great-encounters': 'GE', 'majestic-dawn': 'MD', 'legends-awakened': 'LA',
    'stormfront': 'SF',
    // Platinum Era
    'platinum': 'PL', 'rising-rivals': 'RR', 'supreme-victors': 'SV2', 'arceus': 'AR',
    // HGSS Era
    'heartgold-soulsilver': 'HS', 'unleashed': 'UL', 'undaunted': 'UN',
    'triumphant': 'TM', 'call-of-legends': 'CL',
    // Black & White Era
    'black-white': 'BW', 'emerging-powers': 'EPO', 'noble-victories': 'NVI',
    'next-destinies': 'NXD', 'dark-explorers': 'DEX', 'dragons-exalted': 'DRX',
    'dragon-vault': 'DRV', 'boundaries-crossed': 'BCR', 'plasma-storm': 'PLS',
    'plasma-freeze': 'PLF', 'plasma-blast': 'PLB', 'legendary-treasures': 'LTR',
    // XY Era
    'xy': 'XY', 'flashfire': 'FLF', 'furious-fists': 'FFI', 'phantom-forces': 'PHF',
    'primal-clash': 'PRC', 'double-crisis': 'DCR', 'roaring-skies': 'ROS',
    'ancient-origins': 'AOR', 'breakthrough': 'BKT', 'breakpoint': 'BKP',
    'generations': 'GEN', 'fates-collide': 'FCO', 'steam-siege': 'STS',
    'evolutions': 'EVO',
    // Sun & Moon Era
    'sun-moon': 'SUM', 'guardians-rising': 'GRI', 'burning-shadows': 'BUS',
    'shining-legends': 'SLG', 'crimson-invasion': 'CIN', 'ultra-prism': 'UPR',
    'forbidden-light': 'FLI', 'celestial-storm': 'CES', 'dragon-majesty': 'DRM',
    'lost-thunder': 'LOT', 'team-up': 'TEU', 'detective-pikachu': 'DET',
    'unbroken-bonds': 'UNB', 'unified-minds': 'UNM', 'hidden-fates': 'HIF',
    'cosmic-eclipse': 'CEC',
    // Sword & Shield Era
    'sword-shield': 'SSH', 'rebel-clash': 'RCL', 'darkness-ablaze': 'DAA',
    'champions-path': 'CPA', 'vivid-voltage': 'VIV', 'shining-fates': 'SHF',
    'battle-styles': 'BST', 'chilling-reign': 'CRE', 'evolving-skies': 'EVS',
    'celebrations': 'CEL', 'fusion-strike': 'FST', 'brilliant-stars': 'BRS',
    'astral-radiance': 'ASR', 'pokemon-go': 'PGO', 'lost-origin': 'LOR',
    'silver-tempest': 'SIT', 'crown-zenith': 'CRZ',
    // Scarlet & Violet Era
    'scarlet-violet': 'SVI', 'paldea-evolved': 'PAL', 'obsidian-flames': 'OBF',
    '151': 'MEW', 'paradox-rift': 'PAR', 'paldean-fates': 'PAF',
    'temporal-forces': 'TEF', 'twilight-masquerade': 'TWM', 'shrouded-fable': 'SFA',
    'stellar-crown': 'SCR', 'surging-sparks': 'SSP', 'prismatic-evolutions': 'PRE',
    // 2025 Sets
    'journey-together': 'JTG', 'destined-rivals': 'DRI',
    'black-bolt': 'BLK', 'white-flare': 'WHT',
    'mega-evolution': 'MEG', 'phantasmal-flames': 'PHF2',
    // 2026 Mega Evolution Series
    'ascended-heroes': 'ASH', 'perfect-order': 'PEO',
    'chaos-rising': 'CRI', 'pitch-black': 'PTB',
    'abyss-eye': 'ABE',
  };

  function buildImageUrl(setSlug, cardNumber) {
    if (!setSlug || !cardNumber) return null;
    const setCode = SET_MAP[setSlug];
    if (!setCode) return null;
    const num = cardNumber.split('/')[0].replace(/\D/g, '').replace(/^0+/, '');
    if (!num) return null;
    const paddedNum = num.padStart(3, '0');
    return `https://scrydex.com/img/sets/${setCode}/${paddedNum}.jpg`;
  }

  try {
    const { search, set } = JSON.parse(event.body);
    if (!search) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing search term' }) };

    const query = encodeURIComponent(search + (set ? ' ' + set : ''));
    const searchRes = await fetch(
      `https://api.poketrace.com/v1/cards?search=${query}&market=US&limit=5&product_type=single`,
      { headers: { 'X-API-Key': POKETRACE_KEY } }
    );
    const searchData = await searchRes.json();
    const results = searchData.data || [];
    if (results.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No cards found for: ' + search }) };

    const card = results[0];
    const detailRes = await fetch(
      `https://api.poketrace.com/v1/cards/${card.id}`,
      { headers: { 'X-API-Key': POKETRACE_KEY } }
    );
    const detailData = await detailRes.json();
    const d = detailData.data || card;
    const prices = d.prices || {};

    const image = buildImageUrl(d.set?.slug || card.set?.slug, d.cardNumber || card.cardNumber);

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
    if (avg30 > 0) { trendPct = ((avg7 - avg30) / avg30 * 100); if (trendPct > 3) trend = 'up'; if (trendPct < -3) trend = 'down'; }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        card_name: d.name + (d.cardNumber ? ' #' + d.cardNumber : ''),
        set: d.set?.name || null, variant: d.variant || null, rarity: d.rarity || null,
        last_updated: d.lastUpdated || null, has_graded: d.hasGraded || false,
        image: image,
        raw: { near_mint: { ebay: ebayNM, tcgplayer: tcgNM }, lightly_played: { ebay: ebayLP }, moderately_played: { ebay: ebayMP }, heavily_played: { ebay: ebayHP }, damaged: { ebay: ebayDMG } },
        graded: { psa_10: ebayPSA10, psa_9: ebayPSA9, psa_8: ebayPSA8, bgs_9_5: ebayBGS95, bgs_9: ebayBGS9, cgc_10: ebayCGC10, cgc_9_5: ebayCGC95 },
        market_avg: nmAvg, tcgplayer_recent: tcgNM.avg || null, ebay_recent: ebayNM.avg || null,
        low: Math.min(ebayNM.low||9999, tcgNM.low||9999) === 9999 ? 0 : Math.min(ebayNM.low||9999, tcgNM.low||9999),
        high: Math.max(ebayNM.high||0, tcgNM.high||0),
        num_sales: (ebayNM.saleCount||0) + (tcgNM.saleCount||0),
        trend: trend, trend_pct: Math.round(trendPct * 10) / 10,
        all_results: results.slice(0, 5).map(r => ({
          id: r.id, name: r.name, set: r.set?.name, number: r.cardNumber,
          image: buildImageUrl(r.set?.slug, r.cardNumber)
        }))
      })
    };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
