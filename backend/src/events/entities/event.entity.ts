import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Matches the `event_status` enum created by the InitialSchema migration.
export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'organizer_id', type: 'int' })
  organizerId: number;

  @Column({ name: 'main_interest_id', type: 'int' })
  mainInterestId: number;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'approximate_location', type: 'varchar', length: 100 })
  approximateLocation: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'enum', enum: EventStatus, enumName: 'event_status', default: EventStatus.DRAFT })
  status: EventStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
