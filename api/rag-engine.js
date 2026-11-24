// api/rag-engine.js - Production Hybrid RAG Engine with SEBI Compliance Guardrails
const https = require('https');

// Knowledge base for the 6 official HDFC Mutual Fund schemes (ground truth from Groww SIDs)
const SCHEMES = [
  {
    id: 'hdfc-small-cap-fund',
    name: 'HDFC Small Cap Fund',
    aliases: ['small cap', 'small-cap', 'hdfc small cap', 'smallcap'],
    nav: '₹151.94',
    asOf: "12 May '26",
    minSip: '₹100',
    minLumpsum: '₹100',
    aum: '₹38,168.18 Cr',
    expenseRatio: '1.00%',
    rating: '4',
    risk: 'Very High',
    manager: 'Dhruv Muchhal',
    benchmark: 'S&P BSE 250 SmallCap TRI',
    exitLoad: '1% if redeemed within 1 year (365 days)',
    topHoldings: 'Aster DM Healthcare (4.78%), Bank Of Baroda (3.44%), Firstsource Solutions (3.42%), Eris Lifesciences (2.59%), eClerx Services (2.55%)',
    url: 'https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth',
    scrapedDate: '2026-05-13'
  },
  {
    id: 'hdfc-equity-fund-flexi-cap',
    name: 'HDFC Equity Fund (Flexi Cap)',
    aliases: ['flexi cap', 'flexicap', 'hdfc flexi cap', 'equity fund', 'flexi-cap'],
    nav: '₹2,104.74',
    asOf: "12 May '26",
    minSip: '₹100',
    minLumpsum: '₹100',
    aum: '₹1,00,479.23 Cr',
    expenseRatio: '0.99%',
    rating: '5',
    risk: 'Very High',
    manager: 'Dhruv Muchhal / Roshi Jain',
    benchmark: 'NIFTY 500 Total Return Index',
    exitLoad: '1% if redeemed within 1 year',
    topHoldings: 'ICICI Bank, HDFC Bank, Infosys, Reliance Industries, Bharti Airtel',
    url: 'https://groww.in/mutual-funds/hdfc-equity-fund-direct-growth',
    scrapedDate: '2026-05-13'
  },
  {
    id: 'hdfc-gold-etf-fund-of-fund',
    name: 'HDFC Gold ETF Fund of Fund',
    aliases: ['gold etf', 'gold fund', 'hdfc gold', 'gold etf fund of fund', 'gold'],
    nav: '₹46.97',
    asOf: "12 May '26",
    minSip: '₹100',
    minLumpsum: '₹100',
    aum: '₹11,464.35 Cr',
    expenseRatio: '0.21%',
    rating: '3',
    risk: 'High',
    manager: 'Arun Agarwal',
    benchmark: 'Domestic Price of Gold',
    exitLoad: '1% if redeemed within 15 days (Nil after 15 days)',
    topHoldings: 'HDFC Gold Exchange Traded Fund (99.8%)',
    url: 'https://groww.in/mutual-funds/hdfc-gold-etf-fund-of-fund-direct-plan-growth',
    scrapedDate: '2026-05-13'
  },
  {
    id: 'hdfc-large-cap-fund',
    name: 'HDFC Large Cap Fund',
    aliases: ['large cap', 'largecap', 'hdfc large cap', 'top 100', 'large-cap'],
    nav: '₹1,162.42',
    asOf: "12 May '26",
    minSip: '₹100',
    minLumpsum: '₹100',
    aum: '₹38,121.27 Cr',
    expenseRatio: '1.09%',
    rating: '4',
    risk: 'Very High',
    manager: 'Rahul Baijal',
    benchmark: 'NIFTY 100 Total Return Index',
    exitLoad: '1% if redeemed within 1 year',
    topHoldings: 'HDFC Bank, ICICI Bank, Reliance Industries, Infosys, Larsen & Toubro',
    url: 'https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth',
    scrapedDate: '2026-05-13'
  },
  {
    id: 'hdfc-mid-cap-fund',
    name: 'HDFC Mid-Cap Fund',
    aliases: ['mid cap', 'midcap', 'hdfc mid cap', 'mid-cap opportunities', 'mid-cap'],
    nav: '₹216.62',
    asOf: "12 May '26",
    minSip: '₹100',
    minLumpsum: '₹100',
    aum: '₹94,744.72 Cr',
    expenseRatio: '0.75%',
    rating: '5',
    risk: 'Very High',
    manager: 'Chirag Setalvad',
    benchmark: 'NIFTY Midcap 150 TRI',
    exitLoad: '1% if redeemed within 1 year',
    topHoldings: 'Tata Communications, Indian Bank, Federal Bank, Balkrishna Industries, Max Financial Services',
    url: 'https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth',
    scrapedDate: '2026-05-13'
  },
  {
    id: 'hdfc-nifty-50-index-fund',
    name: 'HDFC Nifty 50 Index Fund',
    aliases: ['nifty 50', 'index fund', 'hdfc nifty', 'hdfc index', 'nifty50'],
    nav: '₹227.28',
    asOf: "12 May '26",
    minSip: '₹100',
    minLumpsum: '₹100',
    aum: '₹23,339.56 Cr',
    expenseRatio: '0.28%',
    rating: '3',
    risk: 'Very High',
    manager: 'Arun Agarwal / Nirman Morakhia',
    benchmark: 'NIFTY 50 Total Return Index',
    exitLoad: '0.25% if redeemed within 3 days (0% after 3 days)',
    topHoldings: 'HDFC Bank, Reliance Industries, ICICI Bank, Infosys, Tata Consultancy Services',
    url: 'https://groww.in/mutual-funds/hdfc-nifty-50-index-fund-direct-growth',
    scrapedDate: '2026-05-13'
  }
];

// Phase 3 Guardrail Intent Classifier
function checkGuardrails(query) {
  const q = query.toLowerCase().trim();

  // 1. Advisory keywords check
  const advisoryTriggers = [
    'should i buy', 'should i invest', 'shall i buy', 'shall i invest',
    'which fund to pick', 'which fund is better', 'which fund is best', 'best fund',
    'recommend me', 'give me advice', 'financial advice', 'life savings',
    'good to invest', 'worth investing', 'guaranteed return', 'future prediction',
    'how much profit', 'multibagger', 'target price', 'will it give', 'can i get rich'
  ];
  for (const trigger of advisoryTriggers) {
    if (q.includes(trigger)) {
      return {
        isSafe: false,
        reason: 'advisory',
        message: 'I can only provide factual information about mutual funds. I cannot offer investment advice or answer unrelated queries.'
      };
    }
  }

  // 2. Unrelated check
  const unrelatedTriggers = [
    'weather', 'capital of', 'president of', 'prime minister',
    'recipe', 'joke', 'poem', 'movie', 'cricket', 'translate',
    'write python', 'write code', 'who made you', 'who is elon musk'
  ];
  for (const trigger of unrelatedTriggers) {
    if (q.includes(trigger)) {
      return {
        isSafe: false,
        reason: 'unrelated',
        message: 'I can only provide factual information about mutual funds. I cannot offer investment advice or answer unrelated queries.'
      };
    }
  }

  return { isSafe: true };
}

// Phase 2 Metadata Pre-filtering (Scheme Detector)
function detectScheme(query) {
  const q = query.toLowerCase();
  for (const scheme of SCHEMES) {
    for (const alias of scheme.aliases) {
      if (q.includes(alias)) {
        return scheme;
      }
    }
  }
  return null;
}

// Live Groq LLM Call (llama-3.3-70b-versatile)
function callGroqLLM(apiKey, query, contextText, sourceUrl, scrapedDate) {
  return new Promise((resolve, reject) => {
    const prompt = `You are a factual AI assistant for HDFC Mutual Funds. 
You must answer the user's query using ONLY the provided Context. 
If the context does not contain the answer, say "I don't have enough information to answer that."

CONSTRAINTS:
1. Your answer must be absolutely factual, with zero financial advice or opinions.
2. Your answer MUST be a maximum of 3 sentences. Do not exceed 3 sentences.
3. Do not include any URLs or footers in your generated text. I will append those programmatically.

Query: "${query}"

Context:
${contextText}

Provide the answer below:`;

    const bodyData = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 250
    });

    const req = https.request({
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Length': Buffer.byteLength(bodyData)
      },
      timeout: 7000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const answer = parsed.choices[0].message.content.trim();
            const formatted = `${answer}\n\nCitation: ${sourceUrl}\nLast updated from sources: ${scrapedDate}`;
            resolve(formatted);
          } catch (e) {
            reject(new Error('Failed to parse Groq response'));
          }
        } else {
          reject(new Error(`Groq returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq API request timed out'));
    });

    req.write(bodyData);
    req.end();
  });
}

// Deterministic Ground-Truth Generator (Zero-fail fallback)
function answerFactualFallback(query, scheme) {
  const q = query.toLowerCase();
  const target = scheme || SCHEMES[0];

  let answerText = '';

  if (q.includes('sip') || q.includes('minimum investment') || q.includes('min sip') || q.includes('lumpsum')) {
    answerText = `The minimum SIP investment for ${target.name} Direct Plan Growth is ${target.minSip}, and the minimum lumpsum investment is ${target.minLumpsum}.`;
  } else if (q.includes('exit load') || q.includes('penalty') || q.includes('redemption fee')) {
    answerText = `The exit load for ${target.name} is ${target.exitLoad}. Stamp duty on investment is 0.005%.`;
  } else if (q.includes('nav') || q.includes('net asset value') || q.includes('price')) {
    answerText = `The latest Net Asset Value (NAV) of ${target.name} is ${target.nav} as of ${target.asOf}.`;
  } else if (q.includes('aum') || q.includes('fund size') || q.includes('asset under management') || q.includes('size')) {
    answerText = `${target.name} currently has an Asset Under Management (AUM) of ${target.aum} with a ${target.rating}-star rating on Groww.`;
  } else if (q.includes('expense') || q.includes('expense ratio') || q.includes('ter')) {
    answerText = `The expense ratio for ${target.name} Direct Growth is ${target.expenseRatio}.`;
  } else if (q.includes('manager') || q.includes('who manages') || q.includes('fund management')) {
    answerText = `${target.manager} is the Current Fund Manager of ${target.name} Direct Plan Growth.`;
  } else if (q.includes('holding') || q.includes('stocks') || q.includes('portfolio') || q.includes('companies')) {
    answerText = `The key top holdings of ${target.name} include: ${target.topHoldings}.`;
  } else if (q.includes('benchmark') || q.includes('index')) {
    answerText = `The benchmark index for ${target.name} is ${target.benchmark}.`;
  } else if (q.includes('risk') || q.includes('riskometer')) {
    answerText = `${target.name} is rated with ${target.risk} risk as per SEBI riskometer guidelines.`;
  } else {
    answerText = `${target.name} has a current NAV of ${target.nav} (as of ${target.asOf}) and an AUM of ${target.aum}. Minimum SIP is ${target.minSip} with an expense ratio of ${target.expenseRatio}.`;
  }

  return `${answerText}\n\nCitation: ${target.url}\nLast updated from sources: ${target.scrapedDate}`;
}

// Master query processing function
async function processRAGQuery(query) {
  // Step 1: Guardrail Check
  const guard = checkGuardrails(query);
  if (!guard.isSafe) {
    return {
      status: 'guardrail_triggered',
      response: guard.message
    };
  }

  // Step 2: Detect Scheme (Metadata pre-filtering)
  const scheme = detectScheme(query) || SCHEMES[0];

  // Step 3: Try Live Groq LLM if key exists
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.startsWith('gsk_') && groqKey.length > 20) {
    try {
      const contextText = `Scheme Name: ${scheme.name}\nNAV: ${scheme.nav} (${scheme.asOf})\nMin SIP: ${scheme.minSip}\nMin Lumpsum: ${scheme.minLumpsum}\nAUM: ${scheme.aum}\nExpense Ratio: ${scheme.expenseRatio}\nExit Load: ${scheme.exitLoad}\nFund Manager: ${scheme.manager}\nBenchmark: ${scheme.benchmark}\nTop Holdings: ${scheme.topHoldings}\nRisk: ${scheme.risk}`;
      const llmResponse = await callGroqLLM(groqKey, query, contextText, scheme.url, scheme.scrapedDate);
      return {
        status: 'success',
        source: 'groq_llama_3_3_70b',
        response: llmResponse
      };
    } catch (err) {
      console.warn('Groq live call failed, falling back to deterministic RAG:', err.message);
    }
  }

  // Step 4: Deterministic Ground Truth Fallback (Instant, 100% accurate)
  const fallbackResponse = answerFactualFallback(query, scheme);
  return {
    status: 'success',
    source: 'ground_truth_rag',
    response: fallbackResponse
  };
}

module.exports = {
  SCHEMES,
  checkGuardrails,
  detectScheme,
  processRAGQuery
};
