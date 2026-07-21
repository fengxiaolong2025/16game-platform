import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPost, CommunityComment, CommunityLike } from './community.entity';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityPost, CommunityComment, CommunityLike]), UserModule],
  providers: [CommunityService],
  controllers: [CommunityController],
  exports: [CommunityService],
})
export class CommunityModule {}
