import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { EventsModule } from './events/events.module';

@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig), AuthModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
