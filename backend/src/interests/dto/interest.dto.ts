import { ApiProperty } from '@nestjs/swagger';

// Shape returned by GET /v1/interests (shown in Swagger).
export class InterestDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Walking and hiking' })
  name: string;
}
