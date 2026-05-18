import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TermEntity } from '../terms/entities/term.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, CategoryEntity, TermEntity])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
