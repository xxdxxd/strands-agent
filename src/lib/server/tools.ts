/**
 * Server-Side Tools Implementation for Strands Agent (SvelteKit server-only)
 */

/**
 * 1. Safe Mathematical Expression Parser
 * Evaluates standard arithmetic expressions avoiding unsafe `eval` or `Function` constructors.
 */
export function evaluateMath(expression: string): { result: number; step: string } {
  // Normalize the expression
  const cleanExpr = expression.replace(/\s+/g, '');
  
  // Guard against illegal characters
  if (!/^[0-9+\-*/().^]+$/.test(cleanExpr)) {
    throw new Error('Expression contains invalid characters. Only numbers, parentheses, and +, -, *, /, %, ^ are allowed.');
  }

  // Tokenization
  const tokens: string[] = [];
  let numAcc = '';
  
  for (let i = 0; i < cleanExpr.length; i++) {
    const char = cleanExpr[i];
    if (/[0-9.]/.test(char)) {
      numAcc += char;
    } else {
      if (numAcc !== '') {
        tokens.push(numAcc);
        numAcc = '';
      }
      // Check for unary negative
      if (char === '-' && (tokens.length === 0 || ['+', '-', '*', '/', '(', '^'].includes(tokens[tokens.length - 1]))) {
        numAcc = '-';
      } else {
        tokens.push(char);
      }
    }
  }
  if (numAcc !== '') {
    tokens.push(numAcc);
  }

  // Recursive Descent Parser
  let cur = 0;

  function peek(): string | null {
    return cur < tokens.length ? tokens[cur] : null;
  }

  function consume(expected?: string): string {
    const t = peek();
    if (t === null) {
      throw new Error('Unexpected end of expression');
    }
    if (expected && t !== expected) {
      throw new Error(`Expected token ${expected} but found ${t}`);
    }
    cur++;
    return t;
  }

  function parsePrimary(): number {
    const t = peek();
    if (t === '(') {
      consume('(');
      const val = parseExpr();
      consume(')');
      return val;
    }
    
    // Parse number
    const numToken = consume();
    const val = parseFloat(numToken);
    if (isNaN(val)) {
      throw new Error(`Invalid number format: ${numToken}`);
    }
    return val;
  }

  function parsePower(): number {
    let base = parsePrimary();
    while (peek() === '^') {
      consume('^');
      const exp = parsePower(); // Right associative
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parseMulDiv(): number {
    let result = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parsePower();
      if (op === '*') {
        result *= rhs;
      } else {
        if (rhs === 0) throw new Error('Division by zero');
        result /= rhs;
      }
    }
    return result;
  }

  function parseExpr(): number {
    let result = parseMulDiv();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseMulDiv();
      if (op === '+') {
        result += rhs;
      } else {
        result -= rhs;
      }
    }
    return result;
  }

  const result = parseExpr();
  if (cur < tokens.length) {
    throw new Error('Unparsed characters at the end of expression');
  }

  return {
    result,
    step: `Evaluating expression: ${cleanExpr} = ${result}`
  };
}

/**
 * 2. Weather Service — hardcoded June temperatures for major world cities.
 *
 * Live Open-Meteo lookup (commented out):
 */
/*
export async function fetchWeather(city: string): Promise<{
  city: string;
  country: string;
  temperature: number;
  windSpeed: number;
  condition: string;
  latitude: number;
  longitude: number;
}> {
  if (!city || city.trim().length === 0) {
    throw new Error('City name cannot be empty');
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoResponse = await fetch(geoUrl, {
    headers: { 'User-Agent': 'aistudio-build' },
  });

  if (!geoResponse.ok) {
    throw new Error(`Failed to resolve city coordinates for "${city}"`);
  }

  const geoData = await geoResponse.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Could not find coordinates for city: "${city}". Please check spelling.`);
  }

  const location = geoData.results[0];
  const { latitude, longitude, name, country } = location;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const weatherResponse = await fetch(weatherUrl, {
    headers: { 'User-Agent': 'aistudio-build' },
  });

  if (!weatherResponse.ok) {
    throw new Error(`Failed to fetch weather data for "${name}"`);
  }

  const weatherData = await weatherResponse.json();
  const current = weatherData.current_weather;

  if (!current) {
    throw new Error(`Weather information not available for "${name}"`);
  }

  const weatherCode = current.weathercode;
  const condition = mapWmoCode(weatherCode);

  return {
    city: name,
    country: country || 'Unknown',
    temperature: current.temperature,
    windSpeed: current.windspeed,
    condition,
    latitude,
    longitude,
  };
}

function mapWmoCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Mainly clear, partly cloudy, or overcast';
  if ([45, 48].includes(code)) return 'Fog or depositing rime fog';
  if ([51, 53, 55].includes(code)) return 'Drizzle: light, moderate, or dense intensity';
  if ([61, 63, 65].includes(code)) return 'Rain: slight, moderate, or heavy intensity';
  if ([71, 73, 75].includes(code)) return 'Snow fall: slight, moderate, or heavy intensity';
  if ([80, 81, 82].includes(code)) return 'Rain showers: slight, moderate, or violent';
  if ([85, 86].includes(code)) return 'Snow showers: slight or heavy';
  if (code >= 95) return 'Thunderstorm: slight or moderate';
  return 'Cloudy';
}
*/

/** Hardcoded average June temperatures (°C) for 10 major cities. */
const JUNE_CITY_TEMPERATURES: Record<string, { city: string; country: string; temperatureCelsius: number }> = {
  paris: { city: 'Paris', country: 'France', temperatureCelsius: 20 },
  london: { city: 'London', country: 'United Kingdom', temperatureCelsius: 19 },
  'new york': { city: 'New York', country: 'United States', temperatureCelsius: 24 },
  nyc: { city: 'New York', country: 'United States', temperatureCelsius: 24 },
  berlin: { city: 'Berlin', country: 'Germany', temperatureCelsius: 21 },
  tokyo: { city: 'Tokyo', country: 'Japan', temperatureCelsius: 23 },
  sydney: { city: 'Sydney', country: 'Australia', temperatureCelsius: 16 },
  dubai: { city: 'Dubai', country: 'United Arab Emirates', temperatureCelsius: 38 },
  singapore: { city: 'Singapore', country: 'Singapore', temperatureCelsius: 29 },
  'los angeles': { city: 'Los Angeles', country: 'United States', temperatureCelsius: 22 },
  moscow: { city: 'Moscow', country: 'Russia', temperatureCelsius: 18 },
};

const SUPPORTED_CITY_NAMES = [...new Set(Object.values(JUNE_CITY_TEMPERATURES).map((entry) => entry.city))];

function normalizeCityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getJuneCityTemperature(city: string): {
  city: string;
  country: string;
  month: 'June';
  temperatureCelsius: number;
  supportedCities: string[];
} {
  if (!city || city.trim().length === 0) {
    throw new Error('City name cannot be empty');
  }

  const entry = JUNE_CITY_TEMPERATURES[normalizeCityKey(city)];
  if (!entry) {
    throw new Error(
      `City "${city}" is not supported. Available cities: ${SUPPORTED_CITY_NAMES.join(', ')}.`
    );
  }

  return {
    city: entry.city,
    country: entry.country,
    month: 'June',
    temperatureCelsius: entry.temperatureCelsius,
    supportedCities: SUPPORTED_CITY_NAMES,
  };
}

export function listJuneCityTemperatures(): Array<{
  city: string;
  country: string;
  month: 'June';
  temperatureCelsius: number;
}> {
  return SUPPORTED_CITY_NAMES.map((cityName) => {
    const entry = JUNE_CITY_TEMPERATURES[normalizeCityKey(cityName)];
    return {
      city: entry.city,
      country: entry.country,
      month: 'June' as const,
      temperatureCelsius: entry.temperatureCelsius,
    };
  });
}

