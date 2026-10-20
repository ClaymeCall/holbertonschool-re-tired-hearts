import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestDto } from './dto/interest.dto';
import { Interest } from './interest.entity';

@Injectable()
export class InterestsService {
  constructor(@InjectRepository(Interest) private readonly interests: Repository<Interest>) {}

  findAll(): Promise<InterestDto[]> {
    return this.interests.find({
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }
}
