import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CheckinService, CheckInGuestData } from '../checkin/checkin.service';
import * as soap from 'soap';

// Portale Alloggiati data structures
interface AlloggiatiGuest {
  Tipo: 16 | 17 | 18 | 19 | 20; // 16=Ospite singolo, 17=Capofamiglia, 18=Capogruppo, 19=Familiare, 20=Membro gruppo
  DataArrivo: string; // YYYY-MM-DD
  NumeroDiGiorniDiPermanenza: number;
  Cognome: string;
  Nome: string;
  Sesso: 1 | 2; // 1=M, 2=F
  DataDiNascita: string; // YYYY-MM-DD
  ComuneDiNascita?: string;
  ProvinciaDiNascita?: string;
  StatoDiNascita: string; // ISO code
  Cittadinanza: string; // ISO code
  TipoDocumento?: string;
  NumeroDocumento?: string;
  LuogoRilascioDocumento?: string;
}

interface AlloggiatiRequest {
  Utente: string;
  Token: string;
  EssePi: string;
  IdAppartamento: string;
  Alloggiati: AlloggiatiGuest[];
}

interface AlloggiatiResponse {
  success: boolean;
  protocolNumber?: string;
  errors?: string[];
}

@Injectable()
export class AlloggiatiService {
  private readonly logger = new Logger(AlloggiatiService.name);
  private soapClient: any = null;

  // Portale Alloggiati WSDL
  private readonly WSDL_URL = 'https://alloggiatiweb.poliziadistato.it/service/service.asmx?wsdl';

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkinService: CheckinService,
  ) {}

  private async getSoapClient() {
    if (this.soapClient) {
      return this.soapClient;
    }

    try {
      this.soapClient = await soap.createClientAsync(this.WSDL_URL, {
        wsdl_options: {
          timeout: 30000,
        },
      });

      this.logger.log('SOAP client for Portale Alloggiati initialized');
      return this.soapClient;
    } catch (error) {
      this.logger.error('Failed to create SOAP client', error);
      throw new Error('Failed to connect to Portale Alloggiati');
    }
  }

  private getCredentials(): { utente: string; token: string; essePi: string } {
    const utente = process.env.ALLOGGIATI_USER;
    const token = process.env.ALLOGGIATI_TOKEN;
    const essePi = process.env.ALLOGGIATI_WSKEY;

    if (!utente || !token || !essePi) {
      throw new BadRequestException(
        'Portale Alloggiati credentials not configured',
      );
    }

    return { utente, token, essePi };
  }

  private getApartmentId(propertyId: string): string {
    // Map property ID to Alloggiati apartment ID
    // In production, this would be stored in the Property model
    const apartmentMapping = JSON.parse(
      process.env.ALLOGGIATI_APARTMENT_MAPPING || '{}',
    );

    return apartmentMapping[propertyId] || propertyId;
  }

  private mapDocumentType(type: string): string {
    const mapping: Record<string, string> = {
      passport: 'PASOR',
      id_card: 'IDENT',
      driving_license: 'PATEN',
    };
    return mapping[type] || 'ALTRO';
  }

  private mapNationality(nationality: string): string {
    // Map common nationality codes to Italian ISO codes
    const mapping: Record<string, string> = {
      IT: '100000100',
      DE: '100000094',
      FR: '100000084',
      GB: '100000219',
      US: '100000536',
      ES: '100000209',
      // Add more as needed
    };
    return mapping[nationality] || nationality;
  }

  private formatGuestForAlloggiati(
    guest: CheckInGuestData,
    arrivalDate: Date,
    departureDate: Date,
    isMain: boolean,
  ): AlloggiatiGuest {
    const nights = Math.ceil(
      (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      Tipo: isMain ? 16 : 19, // 16 = single guest, 19 = family member
      DataArrivo: arrivalDate.toISOString().split('T')[0],
      NumeroDiGiorniDiPermanenza: nights,
      Cognome: guest.lastName.toUpperCase(),
      Nome: guest.firstName.toUpperCase(),
      Sesso: 1, // Default to male - should be in guest data
      DataDiNascita: guest.dateOfBirth,
      StatoDiNascita: this.mapNationality(guest.nationality),
      Cittadinanza: this.mapNationality(guest.nationality),
      TipoDocumento: this.mapDocumentType(guest.documentType),
      NumeroDocumento: guest.documentNumber,
      LuogoRilascioDocumento: guest.documentIssuedBy,
    };
  }

  async sendToAlloggiati(bookingId: string): Promise<AlloggiatiResponse> {
    this.logger.log(`Sending booking ${bookingId} to Portale Alloggiati`);

    // Get booking data
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.alloggiatiSent) {
      return {
        success: true,
        protocolNumber: 'ALREADY_SENT',
      };
    }

    // Get decrypted check-in data
    const checkInData = await this.checkinService.getCheckInData(bookingId);

    if (!checkInData) {
      throw new BadRequestException('Check-in data not found');
    }

    try {
      const credentials = this.getCredentials();
      const apartmentId = this.getApartmentId(booking.propertyId);

      // Build guests list
      const guests: AlloggiatiGuest[] = [];

      // Main guest
      guests.push(
        this.formatGuestForAlloggiati(
          checkInData,
          new Date(booking.checkInDate),
          new Date(booking.checkOutDate),
          true,
        ),
      );

      // Additional guests
      if (checkInData.additionalGuests) {
        for (const additionalGuest of checkInData.additionalGuests) {
          guests.push({
            Tipo: 19, // Family member
            DataArrivo: booking.checkInDate.toISOString().split('T')[0],
            NumeroDiGiorniDiPermanenza: Math.ceil(
              (new Date(booking.checkOutDate).getTime() -
                new Date(booking.checkInDate).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            Cognome: additionalGuest.lastName.toUpperCase(),
            Nome: additionalGuest.firstName.toUpperCase(),
            Sesso: 1, // Default
            DataDiNascita: additionalGuest.dateOfBirth,
            StatoDiNascita: this.mapNationality(additionalGuest.nationality),
            Cittadinanza: this.mapNationality(additionalGuest.nationality),
            TipoDocumento: additionalGuest.documentType
              ? this.mapDocumentType(additionalGuest.documentType)
              : undefined,
            NumeroDocumento: additionalGuest.documentNumber,
          });
        }
      }

      // Build SOAP request
      const request: AlloggiatiRequest = {
        Utente: credentials.utente,
        Token: credentials.token,
        EssePi: credentials.essePi,
        IdAppartamento: apartmentId,
        Alloggiati: guests,
      };

      // In production, actually call the SOAP service
      // For now, simulate success
      const isTestMode = process.env.ALLOGGIATI_TEST_MODE === 'true';

      if (isTestMode) {
        this.logger.log('Test mode - simulating Alloggiati submission');

        // Simulate response
        const protocolNumber = `TEST-${Date.now()}`;

        // Update booking
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { alloggiatiSent: true },
        });

        return {
          success: true,
          protocolNumber,
        };
      }

      // Real SOAP call
      const client = await this.getSoapClient();
      const [result] = await client.TestAsync(request);

      // Parse response
      if (result && result.Esito === 'OK') {
        // Update booking
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { alloggiatiSent: true },
        });

        return {
          success: true,
          protocolNumber: result.NumeroRicevuta,
        };
      } else {
        return {
          success: false,
          errors: result?.Errori || ['Unknown error'],
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to send to Alloggiati for booking ${bookingId}`,
        error,
      );

      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const credentials = this.getCredentials();
      const client = await this.getSoapClient();

      // Call test endpoint
      const [result] = await client.TestAsync({
        Utente: credentials.utente,
        Token: credentials.token,
        EssePi: credentials.essePi,
      });

      return {
        success: result?.Esito === 'OK',
        message: result?.Messaggio || 'Connection test completed',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Get list of pending submissions
  async getPendingSubmissions(): Promise<
    Array<{
      bookingId: string;
      guestName: string;
      propertyName: string;
      checkInDate: Date;
    }>
  > {
    const bookings = await this.prisma.booking.findMany({
      where: {
        checkInCompleted: true,
        alloggiatiSent: false,
      },
      include: {
        property: true,
      },
      orderBy: {
        checkInDate: 'asc',
      },
    });

    return bookings.map((b) => ({
      bookingId: b.id,
      guestName: b.guestName,
      propertyName: b.property.title,
      checkInDate: b.checkInDate,
    }));
  }
}
