import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterestDto } from './dto/interest.dto';
import { InterestsService } from './interests.service';

@ApiTags('interests')
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get()
  @ApiOperation({ summary: 'List all interests, sorted by name (public reference data)' })
  @ApiOkResponse({ type: [InterestDto] })
  findAll(): Promise<InterestDto[]> {
    return this.interestsService.findAll();
  }
}
