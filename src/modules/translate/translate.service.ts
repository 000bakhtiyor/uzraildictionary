import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '../../common/exceptions/base.exception';
import { SUPPORTED_LANGS, SupportedLang } from './dto/translate-text.dto';
import { LocalizedTranslationResponseDto } from './dto/localized-translation-response.dto';

// Tilmoch API til kodlari — https://developer.tahrirchi.uz/uz/docs
const TILMOCH_LANG_CODE: Record<SupportedLang, string> = {
  uz: 'uzn_Latn',
  uzCyrl: 'uzn_Cyrl',
  kk: 'kaa_Latn', // Qoraqalpoqcha (lotin)
  ru: 'rus_Cyrl',
  en: 'eng_Latn',
};

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);

  constructor(private readonly configService: ConfigService) {}

  async translateToAllLanguages(
    text: string,
    sourceLang: SupportedLang = 'uz',
  ): Promise<LocalizedTranslationResponseDto> {
    const targets = SUPPORTED_LANGS.filter((lang) => lang !== sourceLang);

    const results = await Promise.all(
      targets.map((target) => this.translateOne(text, sourceLang, target)),
    );

    const response = {} as LocalizedTranslationResponseDto;
    response[sourceLang] = text;
    targets.forEach((target, i) => {
      response[target] = results[i];
    });

    return response;
  }

  private async translateOne(
    text: string,
    sourceLang: SupportedLang,
    targetLang: SupportedLang,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('tilmoch.apiKey');
    const apiUrl = this.configService.get<string>('tilmoch.apiUrl')!;
    const model = this.configService.get<string>('tilmoch.model');

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey!,
        },
        body: JSON.stringify({
          text,
          source_lang: TILMOCH_LANG_CODE[sourceLang],
          target_lang: TILMOCH_LANG_CODE[targetLang],
          model,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Tilmoch API ${res.status}: ${errBody}`);
      }

      const data = (await res.json()) as { translated_text: string };
      return data.translated_text;
    } catch (err) {
      this.logger.error(
        `Translate ${sourceLang} -> ${targetLang} failed`,
        err as Error,
      );
      throw new BadRequestException(
        `Tarjima xizmati javob bermadi (${sourceLang} → ${targetLang})`,
      );
    }
  }
}
