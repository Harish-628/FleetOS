/**
 * Speech Parser for Multilingual Voice Input (en-IN & ta-IN)
 * Strips unit/currency artifacts and converts spoken words into numbers when required.
 */

// Tamil number words mapping to digits
const TAMIL_NUMBER_WORDS: Record<string, number> = {
  'பூஜ்ஜியம்': 0,
  'சுழியம்': 0,
  'ஒன்று': 1,
  'ஒன்னு': 1,
  'இரண்டு': 2,
  'ரெண்டு': 2,
  'மூன்று': 3,
  'மூணு': 3,
  'நான்கு': 4,
  'நாலு': 4,
  'ஐந்து': 5,
  'அஞ்சு': 5,
  'ஆறு': 6,
  'ஏழு': 7,
  'எட்டு': 8,
  'ஒன்பது': 9,
  'பத்து': 10,
  'இருபது': 20,
  'முப்பது': 30,
  'நாற்பது': 40,
  'ஐம்பது': 50,
  'அறுபது': 60,
  'எழுபது': 70,
  'எண்பது': 80,
  'தொண்ணூறு': 90,
  'நூறு': 100,
  'ஆயிரம்': 1000,
  'லட்சம்': 100000,
};

// English number words
const ENGLISH_NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
};

/**
 * Clean spoken numbers for odometer readings, fuel amount, liters, cash received.
 * Strips words like 'rupees', 'rs', 'ரூபாய்', 'km', 'கிலோமீட்டர்', 'liters', 'லிட்டர்'
 */
export function parseSpokenNumber(transcript: string): number | '' {
  if (!transcript) return '';

  let cleaned = transcript.toLowerCase();

  // Strip common filler and unit words
  cleaned = cleaned
    .replace(/(rupees|rupee|rs\.?|inr|ரூபாய்|ரூ)/gi, '')
    .replace(/(kilometers|kilometer|km|கி\.மீ|கிலோமீட்டர்)/gi, '')
    .replace(/(liters|liter|ltr|லிட்டர்|லி)/gi, '')
    .replace(/(point|புள்ளி|\.)/gi, '.')
    .trim();

  // Try extracting digits directly first (e.g. "142380" or "4500.50")
  const directDigits = cleaned.match(/\d+(\.\d+)?/);
  if (directDigits) {
    const parsed = parseFloat(directDigits[0]);
    if (!isNaN(parsed)) return parsed;
  }

  // Tokenize and parse spoken words if no pure digits
  const tokens = cleaned.split(/[\s,]+/);
  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const token of tokens) {
    let val: number | undefined;

    if (TAMIL_NUMBER_WORDS[token] !== undefined) {
      val = TAMIL_NUMBER_WORDS[token];
    } else if (ENGLISH_NUMBER_WORDS[token] !== undefined) {
      val = ENGLISH_NUMBER_WORDS[token];
    } else if (!isNaN(Number(token))) {
      val = Number(token);
    }

    if (val !== undefined) {
      matchedAny = true;
      if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else if (val === 1000 || val === 100000) {
        current = (current === 0 ? 1 : current) * val;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }

  total += current;

  if (matchedAny && total > 0) {
    return total;
  }

  return '';
}

/**
 * Clean spoken text for customer names and destinations
 */
export function parseSpokenText(transcript: string): string {
  if (!transcript) return '';
  return transcript
    .replace(/\s+/g, ' ')
    .trim();
}
