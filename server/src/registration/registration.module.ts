import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from './registration.entity';
import { Tournament } from '../tournament/tournament.entity';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { NotificationModule } from '../notification/notification.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [TypeOrmModule.forFeature([Registration, Tournament]), NotificationModule, forwardRef(() => TeamModule)],
  providers: [RegistrationService],
  controllers: [RegistrationController],
  exports: [RegistrationService],
})
export class RegistrationModule {}
