import { MigrationInterface, QueryRunner } from 'typeorm';

// Unread messages: `read_at` is set when the recipient opens the conversation. It only feeds the
// recipient's own unread counter and is never returned to the sender (no read receipts).
export class AddMessageReadAt1760000000001 implements MigrationInterface {
  name = 'AddMessageReadAt1760000000001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE messages ADD COLUMN read_at timestamptz`);
    await q.query(`CREATE INDEX messages_unread_idx ON messages (conversation_id) WHERE read_at IS NULL`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS messages_unread_idx`);
    await q.query(`ALTER TABLE messages DROP COLUMN IF EXISTS read_at`);
  }
}
