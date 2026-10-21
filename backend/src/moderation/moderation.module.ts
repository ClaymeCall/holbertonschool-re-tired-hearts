import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from '../events/events.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { User } from '../users/entities/user.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationAction, User]), ProfilesModule, EventsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
