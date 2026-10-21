import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SearchPlacesQuery } from './dto/search-places.query';

// Same options as the global pipe of main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const query = (value: unknown) => pipe.transform(value, { type: 'query', metatype: SearchPlacesQuery });

describe('SearchPlacesQuery', () => {
  it('accepts a text of 2 to 60 characters and trims it', async () => {
    await expect(query({ q: '  lyo ' })).resolves.toMatchObject({ q: 'lyo' });
    await expect(query({ q: 'a'.repeat(60) })).resolves.toMatchObject({ q: 'a'.repeat(60) });
  });

  it.each([
    ['missing', {}],
    ['one character', { q: 'l' }],
    ['only spaces', { q: '   ' }],
    ['61 characters', { q: 'a'.repeat(61) }],
    ['repeated parameter', { q: ['lyon', 'nice'] }],
    ['unknown parameter', { q: 'lyon', limit: 500 }],
  ])('rejects %s', async (_label, value) => {
    await expect(query(value)).rejects.toBeInstanceOf(BadRequestException);
  });
});
