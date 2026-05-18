import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AdminService, termsToCSV } from './admin.service';
import { StatsResponseDto } from './dto/stats-response.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { ImportResultDto } from './dto/import-result.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Public()
  @ApiOperation({ summary: 'Platform statistics (public)' })
  @ApiResponse({ status: 200, type: StatsResponseDto })
  getStats(): Promise<StatsResponseDto> {
    return this.adminService.getStats();
  }

  @Post('import')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk import terms — max 500 per request (ADMIN only)' })
  @ApiResponse({ status: 200, type: ImportResultDto })
  bulkImport(@Body() dto: ImportTermsDto): Promise<ImportResultDto> {
    return this.adminService.bulkImport(dto);
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export all terms as JSON or CSV (ADMIN only)' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false })
  async exportTerms(
    @Res() res: Response,
    @Query('format') format: 'json' | 'csv' = 'json',
  ): Promise<void> {
    const terms = await this.adminService.exportTerms();

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="terms.csv"');
      res.send(termsToCSV(terms));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="terms.json"');
      res.json(terms);
    }
  }
}
