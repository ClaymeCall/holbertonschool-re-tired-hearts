import { Repository } from 'typeorm';
import { Interest } from './interest.entity';
import { InterestsService } from './interests.service';

describe('InterestsService', () => {
  it('reads only id and name, sorted by name', async () => {
    const rows = [{ id: 1, name: 'Cooking' }];
    const repository = { find: jest.fn().mockResolvedValue(rows) };
    const service = new InterestsService(repository as unknown as Repository<Interest>);

    await expect(service.findAll()).resolves.toEqual(rows);
    expect(repository.find).toHaveBeenCalledWith({
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  });
});
