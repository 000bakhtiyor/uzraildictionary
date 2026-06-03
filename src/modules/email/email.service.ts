import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('app.smtpHost'),
      port: config.get<number>('app.smtpPort'),
      secure: config.get<number>('app.smtpPort') === 465,
      auth: {
        user: config.get<string>('app.smtpUser'),
        pass: config.get<string>('app.smtpPass'),
      },
    });
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const from = this.config.get<string>('app.smtpFrom');
    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'UzRail Dictionary — Email tasdiqlash kodi',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Email tasdiqlash</h2>
          <p>Tasdiqlash kodingiz:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f5f5f5;border-radius:8px;text-align:center">
            ${code}
          </div>
          <p style="color:#666;font-size:13px">Kod 10 daqiqa davomida amal qiladi.</p>
        </div>
      `,
    });
    this.logger.log(`OTP sent to ${email}`);
  }
}
