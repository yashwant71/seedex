import fs from 'fs';
import path from 'path';
import { safeFetch } from './safeFetch';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// List of fallback free vision-capable models in case of 404 or persistent failures
const FALLBACK_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'openrouter/free'
];

// Helper to determine if an error code is model- or provider-specific (e.g. timeout, service offline)
// rather than key-specific (e.g. rate limit 429, unauthorized 401, no credits 402, forbidden 403)
function isModelOrProviderError(codeOrStatus) {
  const code = Number(codeOrStatus);
  return code === 404 || code === 408 || code >= 500;
}

const PERFORMANCE_FILE = path.join(process.cwd(), 'openrouter_performance.json');

function trackModelMetric(modelName, statusType, keyIndex) {
  try {
    let stats = {};
    if (fs.existsSync(PERFORMANCE_FILE)) {
      try {
        const fileContent = fs.readFileSync(PERFORMANCE_FILE, 'utf8');
        stats = JSON.parse(fileContent);
      } catch (err) {
        console.error('[OpenRouter Tracker] Error reading/parsing performance file:', err.message);
      }
    }

    if (!stats[modelName]) {
      stats[modelName] = {
        successes: 0,
        rateLimits: 0,
        providerErrors: 0,
        validationErrors: 0,
        otherErrors: 0,
        lastUsed: null,
        keysUsed: {}
      };
    }

    const modelStats = stats[modelName];
    modelStats.lastUsed = new Date().toISOString();

    if (!modelStats.keysUsed) {
      modelStats.keysUsed = {};
    }

    let keyStats = null;
    if (keyIndex !== undefined && keyIndex !== null) {
      const keyName = `Key #${keyIndex}`;
      if (!modelStats.keysUsed[keyName]) {
        modelStats.keysUsed[keyName] = {
          successes: 0,
          rateLimits: 0,
          providerErrors: 0,
          validationErrors: 0,
          otherErrors: 0
        };
      }
      keyStats = modelStats.keysUsed[keyName];
    }

    if (statusType === 'success') {
      modelStats.successes++;
      if (keyStats) keyStats.successes++;
    } else if (statusType === 'rateLimit') {
      modelStats.rateLimits++;
      if (keyStats) keyStats.rateLimits++;
    } else if (statusType === 'providerError') {
      modelStats.providerErrors++;
      if (keyStats) keyStats.providerErrors++;
    } else if (statusType === 'validationError') {
      modelStats.validationErrors++;
      if (keyStats) keyStats.validationErrors++;
    } else {
      modelStats.otherErrors++;
      if (keyStats) keyStats.otherErrors++;
    }

    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.error('[OpenRouter Tracker] Failed to update model performance:', err.message);
  }
}

const SEED_ANALYSIS_PROMPT = `You are an expert botanist, seed identification specialist, and gardening advisor. Analyze this image of a seed and provide comprehensive identification and planting information.

CLIMATE & USER CONTEXT:
1. Keep in mind that the user is a BEGINNER gardener (provide simple, highly-actionable, clear, step-by-step planting/potting steps).
2. The user is located in INDIA, so all planting seasons, planting months, avoid seasons, and monthly planting ratings MUST be tailored specifically for India's tropical/subtropical monsoonal climate cycles (e.g. Winter starting Oct/Nov, Hot dry Summer starting Mar/Apr, Monsoon starting Jun/Jul).

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown, no code blocks, no extra text. Just the raw JSON object.

If you can identify the seed, respond with this exact JSON structure:
{
  "identified": true,
  "commonName": "Common name of the plant",
  "scientificName": "Scientific binomial name",
  "family": "Plant family name",
  "description": "A 2-3 sentence description of this plant and what it grows into",
  "flowerSearchQuery": "The exact flower/plant name to search for images, e.g. 'Sunflower Helianthus annuus flower'",
  "planting": {
    "bestSeason": "Best planting season/months in India",
    "avoidSeason": "Detailed warning of when NOT to plant in India (e.g., peak summer May heat above 40°C or heavy monsoon July flooding)",
    "soilType": "Ideal soil type, drainage, and pH if known",
    "sunlight": "Sun requirements (full sun, partial shade, etc.)",
    "waterNeeds": "Watering frequency and amount for beginners",
    "spacing": "Plant spacing recommendations",
    "depth": "Seed planting depth",
    "germination": "Expected germination time",
    "daysToFlower": "Days from planting to flowering/harvest",
    "idealClimate": "The ideal climate zone type for this plant (e.g., dry tropical, cool temperate, subtropical, etc.)",
    "bloomingSeason": "Expected blooming months or seasons in India",
    "sunlightHours": "Daily hours of direct sunlight required (e.g., '6-8 hours of direct sun', '4 hours of morning sun')",
    "monthlyPlantingSpectrum": [
      { "month": "January", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason why this month is rated this way for planting in India" },
      { "month": "February", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "March", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "April", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "May", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "June", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "July", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "August", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "September", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "October", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "November", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" },
      { "month": "December", "rating": "Ideal or Good or Okay or Avoid", "reason": "Short 1-sentence reason" }
    ]
  },
  "care": {
    "fertilizer": "Beginner-friendly fertilizer recommendations and frequency",
    "pests": "Common pests to watch out for",
    "diseases": "Common diseases to watch out for",
    "tips": ["Tip 1", "Tip 2", "Tip 3"],
    "companionPlants": ["Companion 1", "Companion 2"],
    "toxicity": "Toxicity warnings for pets/humans (e.g., Toxic to dogs/cats if ingested, or Safe/Non-toxic)"
  },
  "lifecycle": "Annual or Perennial or Biennial",
  "thingsToWatchOutFor": "Crucial beginner warnings (e.g., sensitive to overwatering, hates root disturbance, requires immediate staking, prone to seedling damp-off)",
  "difficulty": "Easy or Moderate or Hard",
  "zones": "USDA Hardiness zones",
  "confidence": 85
}

If you CANNOT identify the seed or the image doesn't show a seed, respond with:
{
  "identified": false,
  "commonName": "Unknown Seed",
  "scientificName": "Not identified",
  "family": "Unknown",
  "description": "Could not identify this seed. Try taking a clearer photo with better lighting, or try a different angle. Place the seed on a plain background for best results.",
  "flowerSearchQuery": "seed identification guide",
  "planting": {
    "bestSeason": "Unknown",
    "avoidSeason": "Unknown",
    "soilType": "Unknown",
    "sunlight": "Unknown",
    "waterNeeds": "Unknown",
    "spacing": "Unknown",
    "depth": "Unknown",
    "germination": "Unknown",
    "daysToFlower": "Unknown",
    "idealClimate": "Unknown",
    "bloomingSeason": "Unknown",
    "sunlightHours": "Unknown",
    "monthlyPlantingSpectrum": []
  },
  "care": {
    "fertilizer": "Unknown",
    "pests": "Unknown",
    "diseases": "Unknown",
    "tips": ["Try a clearer photo", "Use a plain white background", "Include something for scale"],
    "companionPlants": [],
    "toxicity": "Unknown"
  },
  "lifecycle": "Unknown",
  "thingsToWatchOutFor": "Unknown",
  "difficulty": "Unknown",
  "zones": "Unknown",
  "confidence": 0
}`;

function getApiKeys() {
  const keys = [];

  // Add primary key first
  const singleKey = process.env.OPENROUTER_API_KEY;
  if (singleKey) {
    keys.push(singleKey.trim());
  }

  // Add additional rotation keys
  let keysEnv = process.env.OPENROUTER_API_KEYS;
  if (keysEnv) {
    keysEnv = keysEnv.trim();
    // Strip outer enclosing single quotes or double quotes
    if (keysEnv.startsWith("'") && keysEnv.endsWith("'")) {
      keysEnv = keysEnv.slice(1, -1).trim();
    }
    if (keysEnv.startsWith('"') && keysEnv.endsWith('"')) {
      keysEnv = keysEnv.slice(1, -1).trim();
    }
    try {
      const parsed = JSON.parse(keysEnv);
      if (Array.isArray(parsed)) {
        parsed.forEach((k) => {
          const cleanKey = k.trim();
          if (cleanKey && !keys.includes(cleanKey)) {
            keys.push(cleanKey);
          }
        });
      }
    } catch (e) {
      // If it's a comma-separated string
      const splitKeys = keysEnv
        .split(',')
        .map((k) => k.replace(/['"\[\]]/g, '').trim())
        .filter((k) => k.startsWith('sk-'));
      
      splitKeys.forEach((k) => {
        if (!keys.includes(k)) {
          keys.push(k);
        }
      });
    }
  }

  return keys;
}

function getFallbackModels() {
  const envModels = process.env.OPENROUTER_FALLBACK_MODELS || process.env.OPENROUTER_MODELS;
  if (envModels) {
    console.log('[OpenRouter] Using model list from environment variables.');
    return envModels
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
  }
  return FALLBACK_MODELS;
}

async function analyzeSeedWithGroq(imageUrl) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  
  console.log(`[Groq] Starting analysis using model "${model}".`);
  
  const isVision = model.toLowerCase().includes('vision') || 
                   model.toLowerCase().includes('vl') || 
                   model.toLowerCase().includes('scout') || 
                   model.toLowerCase().includes('maverick');
  let contentPayload;
  
  if (isVision) {
    contentPayload = [
      {
        type: 'text',
        text: SEED_ANALYSIS_PROMPT,
      },
      {
        type: 'image_url',
        image_url: {
          url: imageUrl,
        },
      },
    ];
  } else {
    contentPayload = `${SEED_ANALYSIS_PROMPT}\n\nNote: The image is available at: ${imageUrl}`;
  }

  const response = await safeFetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: contentPayload,
        },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  console.log(`[Groq] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Groq] Error payload:`, errorText);
    throw new Error(`Groq API responded with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from Groq');
  }

  console.log(`[Groq] Successful response received. Length: ${content.length} characters.`);

  // Clean up markdown block formatting if model returned it
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const result = JSON.parse(jsonStr);
    console.log(`[Groq] Parsed plant details successfully:`, result.commonName);
    return result;
  } catch (jsonErr) {
    console.error(`[Groq] JSON parsing failed:`, jsonErr.message);
    console.error(`[Groq] Raw content was:`, content);
    throw jsonErr;
  }
}

export async function analyzeSeed(imageUrl) {
  const useGroq = process.env.USE_GROQ === 'true';
  if (useGroq) {
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    console.log(`[Seed Analysis] Routing request to GROQ using model: "${model}"`);
    return analyzeSeedWithGroq(imageUrl);
  }

  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    console.error('[OpenRouter] ERROR: No API keys configured in OPENROUTER_API_KEYS or OPENROUTER_API_KEY.');
    throw new Error('No OpenRouter API keys configured');
  }

  // Determine models to try (user model first, then fallbacks)
  const fallbacks = getFallbackModels();
  const userModel = process.env.OPENROUTER_MODEL || fallbacks[0];
  const modelsToTry = [userModel, ...fallbacks.filter((m) => m !== userModel)];

  console.log(`[Seed Analysis] Routing request to OpenRouter using models: ${modelsToTry.join(', ')} (${apiKeys.length} configured API keys)`);

  let lastError = null;

  // Outer loop: iterate models
  for (const model of modelsToTry) {
    console.log(`[OpenRouter] Trying model: ${model}`);

    // Inner loop: iterate API keys with retries
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      const keySnippet = apiKey.slice(0, 10) + '...' + apiKey.slice(-6);
      console.log(`[OpenRouter] Attempting request using Key #${i + 1} (${keySnippet}) and Model "${model}"`);

      try {
        const response = await safeFetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Seedex - Seed Analysis App',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: SEED_ANALYSIS_PROMPT,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageUrl,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        });

        console.log(`[OpenRouter] Response status: ${response.status} ${response.statusText}`);

        if (response.status === 429) {
          console.warn(`[OpenRouter] Key #${i + 1} returned 429 (Rate Limit). Rotating keys...`);
          lastError = new Error(`Rate limit exceeded (429) on key #${i + 1}`);
          trackModelMetric(model, 'rateLimit', i + 1);
          continue; // Try next API key
        }

        if (isModelOrProviderError(response.status)) {
          console.warn(`[OpenRouter] Model "${model}" failed with status ${response.status}. Trying next model...`);
          lastError = new Error(`Model/Provider error (${response.status})`);
          trackModelMetric(model, 'providerError', i + 1);
          break; // Break inner loop to try next model with all keys
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[OpenRouter] Error payload (status ${response.status}):`, errorText);
          lastError = new Error(`OpenRouter API responded with status ${response.status}`);
          trackModelMetric(model, 'otherError', i + 1);
          continue; // Try next API key
        }

        const data = await response.json();

        if (data.error) {
          const errCode = data.error.code || 500;
          const errMsg = data.error.message || JSON.stringify(data.error);
          console.error(`[OpenRouter] API returned an error block in response:`, JSON.stringify(data.error, null, 2));
          lastError = new Error(`OpenRouter Error: ${errMsg}`);

          if (isModelOrProviderError(errCode)) {
            console.warn(`[OpenRouter] Model "${model}" returned provider error ${errCode} inside payload. Trying next model...`);
            trackModelMetric(model, 'providerError', i + 1);
            break; // Break inner loop to try next model with all keys
          } else if (Number(errCode) === 429) {
            trackModelMetric(model, 'rateLimit', i + 1);
          } else {
            trackModelMetric(model, 'otherError', i + 1);
          }
          continue; // Try next API key
        }

        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          console.warn(`[OpenRouter] Empty choices or message content. Full Response:`, JSON.stringify(data, null, 2));
          lastError = new Error('Empty response from model');
          trackModelMetric(model, 'otherError', i + 1);
          continue; // Try next API key
        }

        console.log(`[OpenRouter] Successful response received. Length: ${content.length} characters.`);

        // Clean up markdown block formatting if model returned it
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        try {
          const result = JSON.parse(jsonStr);
          console.log(`[OpenRouter] Parsed plant details successfully:`, result.commonName);
          trackModelMetric(model, 'success', i + 1);
          return result;
        } catch (jsonErr) {
          console.error(`[OpenRouter] JSON parsing failed for model "${model}":`, jsonErr.message);
          console.error(`[OpenRouter] Raw content was:`, content);
          lastError = jsonErr;
          trackModelMetric(model, 'validationError', i + 1);
          break; // Break inner loop to try next model
        }

      } catch (error) {
        console.error(`[OpenRouter] Exception occurred on attempt:`, error.message);
        lastError = error;
        trackModelMetric(model, 'otherError', i + 1);
        // Proceed to try next key
      }
    }
  }

  // If all attempts failed
  console.error('[OpenRouter] All keys and fallback models exhausted. Failed to analyze seed.');
  throw lastError || new Error('All OpenRouter API attempts failed.');
}
