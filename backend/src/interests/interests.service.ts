import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Interest } from './entities/interest.entity';

@Injectable()
export class InterestsService {
  constructor(@InjectRepository(Interest) private readonly interests: Repository<Interest>) {}

  findAll(): Promise<Interest[]> {
    return this.interests.find({ order: { name: 'ASC' } });
  }

  findByIds(ids: number[]): Promise<Interest[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.interests.find({ where: { id: In(ids) } });
  }
}
