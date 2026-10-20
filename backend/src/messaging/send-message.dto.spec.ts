import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { MessagesQuery } from './dto/messages.query';
import { SendMessageDto } from './dto/send-message.dto';

// Same options as the global pipe of main.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (value: unknown) => pipe.transform(value, { type: 'body', metatype: SendMessageDto });
const query = (value: unknown) => pipe.transform(value, { type: 'query', metatype: MessagesQuery });

describe('SendMessageDto', () => {
  it('accepts a message and trims it', async () => {
    await expect(body({ content: '  Bonjour !  ' })).resolves.toMatchObject({ content: 'Bonjour !' });
  });

  it('accepts exactly 1,000 characters and refuses 1,001', async () => {
    await expect(body({ content: 'a'.repeat(1000) })).resolves.toBeDefined();
    await expect(body({ content: 'a'.repeat(1001) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts characters, not UTF-16 units: 1,000 emojis are accepted, 1,001 are not', async () => {
    await expect(body({ content: '😀'.repeat(1000) })).resolves.toBeDefined();
    await expect(body({ content: '😀'.repeat(1001) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([[''], ['   '], ['\n\t ']])('refuses an empty message (%j)', async (content) => {
    await expect(body({ content })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gives a clear message for an empty or too long message', async () => {
    const reasons = async (value: unknown): Promise<string[]> => {
      const error = await body(value).catch((e: BadRequestException) => e);
      return (error as BadRequestException).getResponse()['message'];
    };
    expect(await reasons({ content: '  ' })).toContain('The message cannot be empty.');
    expect(await reasons({ content: 'a'.repeat(1001) })).toContain('The message cannot be longer than 1000 characters.');
  });

  it.each([[undefined], [null], [42], [{ text: 'x' }], [['a']]])('refuses a non-text content (%j)', async (content) => {
    await expect(body({ content })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([['senderId'], ['recipientId'], ['fromMe'], ['readAt']])('refuses a body that sets %s', async (field) => {
    await expect(body({ content: 'Bonjour', [field]: 5 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps HTML as plain text, unchanged', async () => {
    await expect(body({ content: '<script>alert(1)</script>' })).resolves.toMatchObject({
      content: '<script>alert(1)</script>',
    });
  });
});

describe('MessagesQuery', () => {
  it('returns up to 200 messages by default', async () => {
    await expect(query({})).resolves.toMatchObject({ limit: 200 });
  });

  it.each([{ limit: '0' }, { limit: '201' }, { limit: 'abc' }])('refuses %j', async (value) => {
    await expect(query(value)).rejects.toBeInstanceOf(BadRequestException);
  });
});
