import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterestResponseDto, toInterestResponse } from './dto/interest-response.dto';
import { InterestsService } from './interests.service';

@ApiTags('interests')
@Controller('interests')
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Get()
  @ApiOperation({ summary: 'List the fixed set of selectable interests (public)' })
  async findAll(): Promise<InterestResponseDto[]> {
    const interests = await this.interests.findAll();
    return interests.map(toInterestResponse);
  }
}
