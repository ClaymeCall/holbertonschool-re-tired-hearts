import { Injectable, Logger } from '@nestjs/common';
import { PlaceSearchResponseDto, PlaceSuggestionDto } from './dto/place-search-response.dto';

// geo.api.gouv.fr: the official French municipality directory. Free, no API key.
const GEO_API_URL = 'https://geo.api.gouv.fr/communes';
const TIMEOUT_MS = 2000;
const MAX_SUGGESTIONS = 8;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

interface CacheEntry {
  expiresAt: number;
  suggestions: PlaceSuggestionDto[];
}

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);
  private readonly cache = new Map<string, CacheEntry>();

  // Never throws: when the provider is slow, down or answers garbage, the caller gets
  // `available: false` and the front end keeps the free text input (docs/external-api.md).
  async search(text: string): Promise<PlaceSearchResponseDto> {
    const key = text.toLocaleLowerCase('fr');
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { suggestions: cached.suggestions, available: true };
    }

    try {
      const suggestions = await this.fetchSuggestions(text);
      this.remember(key, suggestions);
      return { suggestions, available: true };
    } catch (error) {
      // The typed text is not logged: it is user input.
      this.logger.warn(`Place lookup unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
      return { suggestions: [], available: false };
    }
  }

  private async fetchSuggestions(text: string): Promise<PlaceSuggestionDto[]> {
    const url = new URL(GEO_API_URL);
    url.searchParams.set('nom', text);
    url.searchParams.set('fields', 'nom,codesPostaux');
    url.searchParams.set('boost', 'population');
    url.searchParams.set('limit', String(MAX_SUGGESTIONS));

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return parseMunicipalities(await response.json());
  }

  // Failures are never cached, so the next keystroke retries the provider.
  private remember(key: string, suggestions: PlaceSuggestionDto[]): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, suggestions });
  }
}

// Only what we use is kept, and nothing is trusted: an unexpected shape is an unavailable
// provider, a malformed entry is simply skipped.
function parseMunicipalities(body: unknown): PlaceSuggestionDto[] {
  if (!Array.isArray(body)) {
    throw new Error('unexpected response shape');
  }
  const suggestions: PlaceSuggestionDto[] = [];
  for (const item of body) {
    const name = typeof item?.nom === 'string' ? item.nom.trim() : '';
    if (!name) {
      continue;
    }
    const postalCodes: unknown[] = Array.isArray(item.codesPostaux) ? item.codesPostaux : [];
    const first = postalCodes.find((code): code is string => typeof code === 'string');
    suggestions.push({ name, postalCode: first ?? null });
  }
  return suggestions.slice(0, MAX_SUGGESTIONS);
}
