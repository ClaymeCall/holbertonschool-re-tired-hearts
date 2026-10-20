import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

// Every field is optional. The status cannot be changed here: use publish / cancel / complete.
export class UpdateEventDto extends PartialType(CreateEventDto) {}
