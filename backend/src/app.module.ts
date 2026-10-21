import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { EventsModule } from './events/events.module';
import { InterestsModule } from './interests/interests.module';
import { MessagingModule } from './messaging/messaging.module';
import { ProfilesModule } from './profiles/profiles.module';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig), AuthModule, ProfilesModule, InterestsModule, EventsModule, MessagingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
