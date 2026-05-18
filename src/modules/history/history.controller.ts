import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { HistoryService } from './history.service';
import { ReadingHistoryResponseDto } from './dto/reading-history-response.dto';

@ApiTags('History')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get my reading history (paginated, latest first)' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ReadingHistoryResponseDto>> {
    return this.historyService.findAll(user.sub, query);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all reading history' })
  clearAll(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.historyService.clearAll(user.sub);
  }

  @Delete(':termId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove one term from reading history' })
  clearOne(
    @CurrentUser() user: JwtPayload,
    @Param('termId') termId: string,
  ): Promise<void> {
    return this.historyService.clearOne(user.sub, termId);
  }
}
