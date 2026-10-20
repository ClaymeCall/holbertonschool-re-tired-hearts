import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Interest } from './entities/interest.entity';
import { InterestsService } from './interests.service';

describe('InterestsService', () => {
  let service: InterestsService;
  let repo: { find: jest.Mock };

  beforeEach(async () => {
    repo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InterestsService, { provide: getRepositoryToken(Interest), useValue: repo }],
    }).compile();

    service = module.get<InterestsService>(InterestsService);
  });

  it('findAll orders interests by name', async () => {
    repo.find.mockResolvedValue([]);

    await service.findAll();

    expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });

  it('findByIds returns an empty array without querying for an empty id list', async () => {
    const result = await service.findByIds([]);

    expect(result).toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });
});
