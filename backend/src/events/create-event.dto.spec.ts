import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { UpdateEventDto } from './dto/update-event.dto';

// Same options as the global pipe of main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => unknown, value: unknown) => pipe.transform(value, { type: 'body', metatype });
const query = (value: unknown) => pipe.transform(value, { type: 'query', metatype: ListEventsQuery });

const valid = {
  title: '  Balade  ',
  description: 'Une sortie',
  approximateLocation: 'Lyon',
  startsAt: '2030-01-01T10:00:00.000Z',
  capacity: 10,
  mainInterestId: 3,
};

describe('CreateEventDto', () => {
  it('accepts a valid body and trims the text fields', async () => {
    await expect(body(CreateEventDto, valid)).resolves.toMatchObject({ title: 'Balade', capacity: 10 });
  });

  it.each([
    ['a status', { status: 'published' }],
    ['an organizer id', { organizerId: 99 }],
    ['a registered count', { registeredCount: 0 }],
  ])('rejects a body that tries to set %s', async (_name, extra) => {
    await expect(body(CreateEventDto, { ...valid, ...extra })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['capacity 0', { capacity: 0 }],
    ['negative capacity', { capacity: -3 }],
    ['capacity above 1000', { capacity: 1001 }],
    ['a fractional capacity', { capacity: 2.5 }],
    ['a blank title', { title: '   ' }],
    ['a title over 120 characters', { title: 'a'.repeat(121) }],
    ['a location over 100 characters', { approximateLocation: 'a'.repeat(101) }],
    ['an invalid date', { startsAt: 'tomorrow' }],
    ['a missing interest', { mainInterestId: undefined }],
  ])('rejects %s', async (_name, change) => {
    await expect(body(CreateEventDto, { ...valid, ...change })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UpdateEventDto', () => {
  it('makes every field optional', async () => {
    await expect(body(UpdateEventDto, { capacity: 5 })).resolves.toMatchObject({ capacity: 5 });
    await expect(body(UpdateEventDto, {})).resolves.toBeDefined();
  });

  it('cannot change the status or the organizer', async () => {
    await expect(body(UpdateEventDto, { status: 'cancelled' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(body(UpdateEventDto, { organizerId: 2 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still validates the fields it receives', async () => {
    await expect(body(UpdateEventDto, { capacity: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ListEventsQuery', () => {
  it('uses page 1 and 12 items by default', async () => {
    await expect(query({})).resolves.toMatchObject({ page: 1, limit: 12 });
  });

  it('converts the query string to numbers', async () => {
    await expect(query({ page: '2', limit: '20', interest: '3', location: ' Lyon ' })).resolves.toMatchObject({
      page: 2,
      limit: 20,
      interest: 3,
      location: 'Lyon',
    });
  });

  it.each([{ page: '0' }, { page: 'abc' }, { limit: '0' }, { limit: '51' }, { interest: 'x' }])(
    'rejects %j',
    async (value) => {
      await expect(query(value)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
