import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermEntity } from './entities/term.entity';
import { TermsService } from './terms.service';
import { TermsController } from './terms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TermEntity])],
  providers: [TermsService],
  controllers: [TermsController],
})
export class TermsModule {}
