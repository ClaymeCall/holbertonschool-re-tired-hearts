import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Reference data: the rows are inserted by the initial migration, the API only reads them.
@Entity('interests')
export class Interest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;
}
