import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { HistoryService } from '../history/history.service';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { AddRelationDto } from './dto/add-relation.dto';
import { TermQueryDto, TermSearchQueryDto } from './dto/term-query.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { TermRelationResponseDto } from './dto/term-relation-response.dto';
import { AutocompleteResponseDto } from './dto/autocomplete-response.dto';

@ApiTags('Terms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('terms')
export class TermsController {
  constructor(
    private readonly termsService: TermsService,
    private readonly historyService: HistoryService,
  ) {}

  // ─── Write (ADMIN) ─────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a term (ADMIN only)' })
  @ApiResponse({ status: 201, type: TermResponseDto })
  create(@Body() dto: CreateTermDto): Promise<TermResponseDto> {
    return this.termsService.create(dto);
  }

  // ─── Static routes (before :id) ────────────────────────────

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search — FTS default, ?fuzzy=true for pg_trgm' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  search(
    @Query() query: TermSearchQueryDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    return this.termsService.search(query, user?.role !== UserRole.ADMIN);
  }

  @Get('autocomplete')
  @Public()
  @ApiOperation({ summary: 'Autocomplete — prefix match, max 7 results' })
  @ApiResponse({ status: 200, type: [AutocompleteResponseDto] })
  autocomplete(
    @Query('q') q: string,
    @Query('lang') lang?: string,
  ): Promise<AutocompleteResponseDto[]> {
    return this.termsService.autocomplete(q ?? '', lang);
  }

  @Get('daily')
  @Public()
  @ApiOperation({ summary: 'Term of the day (cached 1h)' })
  @ApiResponse({ status: 200, type: TermResponseDto })
  getDailyTerm(): Promise<TermResponseDto> {
    return this.termsService.getDailyTerm();
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Most viewed terms all-time (cached 5min)' })
  @ApiResponse({ status: 200, type: [TermResponseDto] })
  getPopular(@Query('limit') limit?: string): Promise<TermResponseDto[]> {
    return this.termsService.getPopular(limit ? parseInt(limit, 10) : 10);
  }

  @Get('trending')
  @Public()
  @ApiOperation({ summary: 'Trending — most viewed in last N days (cached 5min)' })
  @ApiResponse({ status: 200, type: [TermResponseDto] })
  getTrending(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ): Promise<TermResponseDto[]> {
    return this.termsService.getTrending(
      days ? parseInt(days, 10) : 7,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('index')
  @Public()
  @ApiOperation({ summary: 'Alphabet index — terms grouped A-Z (cached 1h)' })
  @ApiResponse({ status: 200 })
  getAlphabetIndex(
    @Query('lang') lang = 'en',
  ): Promise<Record<string, TermResponseDto[]>> {
    return this.termsService.getAlphabetIndex(lang);
  }

  // ─── Collection ────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all terms — supports ?tag=diesel, ?categoryId=' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @Query() query: TermQueryDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    return this.termsService.findAll(query, user?.role !== UserRole.ADMIN);
  }

  // ─── :id routes ────────────────────────────────────────────

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get term by slug (SEO-friendly)' })
  @ApiResponse({ status: 200, type: TermResponseDto })
  findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<TermResponseDto> {
    return this.termsService.findBySlug(slug, user?.role !== UserRole.ADMIN);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get term by id' })
  @ApiResponse({ status: 200, type: TermResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<TermResponseDto> {
    return this.termsService.findOne(id, user?.role !== UserRole.ADMIN);
  }

  @Post(':id/view')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment view count. If authenticated, also saves to reading history.' })
  async incrementView(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<{ viewCount: number }> {
    const result = await this.termsService.incrementView(id);
    if (user?.sub) {
      await this.historyService.track(user.sub, id).catch(() => null);
    }
    return result;
  }

  @Get(':id/relations')
  @Public()
  @ApiOperation({ summary: 'Get all relations for a term (bidirectional)' })
  @ApiResponse({ status: 200, type: [TermRelationResponseDto] })
  getRelations(@Param('id') id: string): Promise<TermRelationResponseDto[]> {
    return this.termsService.getRelations(id);
  }

  @Post(':id/relations')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a relation to a term (ADMIN only)' })
  @ApiResponse({ status: 201, type: TermRelationResponseDto })
  addRelation(
    @Param('id') id: string,
    @Body() dto: AddRelationDto,
  ): Promise<TermRelationResponseDto> {
    return this.termsService.addRelation(id, dto);
  }

  @Delete(':id/relations/:relationId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a relation (ADMIN only)' })
  removeRelation(
    @Param('id') id: string,
    @Param('relationId') relationId: string,
  ): Promise<void> {
    return this.termsService.removeRelation(id, relationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update term (ADMIN only)' })
  @ApiResponse({ status: 200, type: TermResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
  ): Promise<TermResponseDto> {
    return this.termsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete term (ADMIN only)' })
  remove(@Param('id') id: string): Promise<void> {
    return this.termsService.remove(id);
  }
}
