import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = config.get<number>('SMTP_PORT');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: { user, pass },
      });
    }
  }

  async sendLeadNotification(payload: {
    name: string;
    email: string;
    message: string;
    source: string;
  }) {
    if (!this.transporter) {
      this.logger.warn('SMTP non configurato. Email non inviata.');
      return;
    }

    await this.transporter.sendMail({
      from: 'Immobiliare Fiumana <noreply@immobiliarefiumana.it>',
      to: 'leads@immobiliarefiumana.it',
      subject: `Nuovo lead (${payload.source})`,
      text: `${payload.name} (${payload.email})\n\n${payload.message}`,
    });
  }
}
