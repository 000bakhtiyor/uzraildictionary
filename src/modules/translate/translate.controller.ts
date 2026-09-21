import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { TranslateService } from './translate.service';
import { TranslateTextDto } from './dto/translate-text.dto';
import { LocalizedTranslationResponseDto } from './dto/localized-translation-response.dto';

@ApiTags('Translate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Matnni barcha tillarga avtomatik tarjima qilish (faqat ADMIN)" })
  @ApiResponse({ status: 200, type: LocalizedTranslationResponseDto })
  translate(@Body() dto: TranslateTextDto): Promise<LocalizedTranslationResponseDto> {
    return this.translateService.translateToAllLanguages(dto.text, dto.sourceLang);
  }
}