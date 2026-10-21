import { ApiProperty } from '@nestjs/swagger';

export class PlaceSuggestionDto {
  @ApiProperty({ example: 'Lyon' })
  name: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '69001',
    description: 'First postal code of the municipality (a large city has several)',
  })
  postalCode: string | null;
}

export class PlaceSearchResponseDto {
  @ApiProperty({ type: [PlaceSuggestionDto] })
  suggestions: PlaceSuggestionDto[];

  @ApiProperty({
    description:
      'false when the external service could not answer: the front end then keeps the plain text input',
  })
  available: boolean;
}
