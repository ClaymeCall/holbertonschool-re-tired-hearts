import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Matches the `interests` table created by the InitialSchema migration (#31): a read-only
// reference list (members cannot create interests), per docs/design-decisions.md §1.
@Entity({ name: 'interests' })
export class Interest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;
}
