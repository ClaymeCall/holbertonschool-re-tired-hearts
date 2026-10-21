import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaceSearchResponseDto } from './dto/place-search-response.dto';
import { SearchPlacesQuery } from './dto/search-places.query';
import { PlacesService } from './places.service';

@ApiTags('places')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Not authenticated or session expired' })
@UseGuards(JwtAuthGuard)
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Suggest French municipalities for a typed text (member)' })
  @ApiOkResponse({
    type: PlaceSearchResponseDto,
    description: 'Always 200: `available: false` means the external service is down, keep the free text input',
  })
  search(@Query() query: SearchPlacesQuery): Promise<PlaceSearchResponseDto> {
    return this.places.search(query.q);
  }
}
