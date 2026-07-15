import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HonorRoll } from './honor-roll.entity';
import { HonorRollService } from './honor-roll.service';
import { HonorRollController } from './honor-roll.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([HonorRoll]), UserModule],
  providers: [HonorRollService],
  controllers: [HonorRollController],
  exports: [HonorRollService],
})
export class HonorRollModule {}
