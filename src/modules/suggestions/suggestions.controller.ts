import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { SuggestionsService } from './suggestions.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { ReviewSuggestionDto } from './dto/review-suggestion.dto';
import { QuerySuggestionsDto } from './dto/query-suggestions.dto';
import { SuggestionResponseDto } from './dto/suggestion-response.dto';

@ApiTags('Suggestions')
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a term suggestion (public, 5/hr)' })
  @ApiResponse({ status: 201, type: SuggestionResponseDto })
  create(
    @Body() dto: CreateSuggestionDto,
    @CurrentUser() user: JwtPayload | undefined,
  ): Promise<SuggestionResponseDto> {
    return this.suggestionsService.create(dto, user?.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List suggestions with filters (ADMIN only)' })
  @ApiResponse({ status: 200 })
  findAll(
    @Query() query: QuerySuggestionsDto,
  ): Promise<PaginatedResponseDto<SuggestionResponseDto>> {
    return this.suggestionsService.findAll(query);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Edit suggestion content (ADMIN only)' })
  @ApiResponse({ status: 200, type: SuggestionResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSuggestionDto,
  ): Promise<SuggestionResponseDto> {
    return this.suggestionsService.update(id, dto);
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approve or reject a suggestion (ADMIN only)' })
  @ApiResponse({ status: 200, type: SuggestionResponseDto })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewSuggestionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SuggestionResponseDto> {
    return this.suggestionsService.review(id, dto, user.sub);
  }
}
