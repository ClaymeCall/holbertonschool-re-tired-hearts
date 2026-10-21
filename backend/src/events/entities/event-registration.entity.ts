import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Matches the `registration_status` enum created by the InitialSchema migration.
export enum RegistrationStatus {
  REGISTERED = 'registered',
  WITHDRAWN = 'withdrawn',
}

// One row per (event, member): withdrawing updates the row, registering again reactivates it
// (the database has UNIQUE (event_id, user_id)).
@Entity({ name: 'event_registrations' })
export class EventRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id', type: 'int' })
  eventId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    enumName: 'registration_status',
    default: RegistrationStatus.REGISTERED,
  })
  status: RegistrationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
