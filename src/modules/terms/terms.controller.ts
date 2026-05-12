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
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermQueryDto, TermSearchQueryDto } from './dto/term-query.dto';
import { TermResponseDto } from './dto/term-response.dto';

@ApiTags('Terms')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a term (ADMIN only)' })
  @ApiResponse({ status: 201, type: TermResponseDto })
  create(@Body() dto: CreateTermDto): Promise<TermResponseDto> {
    return this.termsService.create(dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search terms by query string' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  search(
    @Query() query: TermSearchQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    const onlyActive = user.role !== UserRole.ADMIN;
    return this.termsService.search(query, onlyActive);
  }

  @Get()
  @ApiOperation({ summary: 'Get all terms with pagination' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @Query() query: TermQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    const onlyActive = user.role !== UserRole.ADMIN;
    return this.termsService.findAll(query, onlyActive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get term by id' })
  @ApiResponse({ status: 200, type: TermResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TermResponseDto> {
    const onlyActive = user.role !== UserRole.ADMIN;
    return this.termsService.findOne(id, onlyActive);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete term (ADMIN only)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.termsService.remove(id);
  }
}
