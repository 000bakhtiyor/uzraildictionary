import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TermEntity } from './entities/term.entity';
import { TermViewEntity } from './entities/term-view.entity';
import { TermRelationEntity } from './entities/term-relation.entity';
import { TermsService } from './terms.service';
import { TermsController } from './terms.controller';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TermEntity, TermViewEntity, TermRelationEntity]),
    HistoryModule,
  ],
  providers: [TermsService],
  controllers: [TermsController],
})
export class TermsModule {}
