import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { FavoritesService } from './favorites.service';
import { FavoriteResponseDto } from './dto/favorite-response.dto';

@ApiTags('Favorites')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':termId')
  @ApiOperation({ summary: 'Add term to favorites' })
  @ApiResponse({ status: 201, type: FavoriteResponseDto })
  add(
    @CurrentUser() user: JwtPayload,
    @Param('termId') termId: string,
  ): Promise<FavoriteResponseDto> {
    return this.favoritesService.add(user.sub, termId);
  }

  @Delete(':termId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove term from favorites' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('termId') termId: string,
  ): Promise<void> {
    return this.favoritesService.remove(user.sub, termId);
  }

  @Get()
  @ApiOperation({ summary: 'Get my favorites (paginated)' })
  @ApiResponse({ status: 200, type: PaginatedResponseDto })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<FavoriteResponseDto>> {
    return this.favoritesService.findAll(user.sub, query);
  }

  @Get(':termId/check')
  @ApiOperation({ summary: 'Check if a term is in favorites' })
  @ApiResponse({ status: 200, schema: { properties: { isFavorite: { type: 'boolean' } } } })
  isFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('termId') termId: string,
  ): Promise<{ isFavorite: boolean }> {
    return this.favoritesService.isFavorite(user.sub, termId);
  }
}
