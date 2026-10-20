import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';

describe('InterestsController', () => {
  it('returns the interests provided by the service', async () => {
    const interests = [{ id: 1, name: 'Cooking' }];
    const service = { findAll: jest.fn().mockResolvedValue(interests) };
    const controller = new InterestsController(service as unknown as InterestsService);

    await expect(controller.findAll()).resolves.toEqual(interests);
  });
});
