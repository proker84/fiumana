import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MediaService } from '../media/media.service';

interface AirbnbListingData {
  id: string;
  title: string;
  description: string;
  location: {
    city: string;
    province: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  bedrooms?: number;
  bathrooms?: number;
  sleeps?: number;
  amenities: string[];
  photos: string[];
  cin?: string;
}

@Injectable()
export class AirbnbImportService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  extractListingId(url: string): string {
    // Extract ID from URLs like:
    // https://www.airbnb.it/rooms/1121692424609140092?...
    // https://airbnb.com/rooms/1121692424609140092
    const match = url.match(/\/rooms\/(\d+)/);
    if (!match) {
      throw new BadRequestException('URL Airbnb non valido. Deve contenere /rooms/ID');
    }
    return match[1];
  }

  async fetchListingData(url: string): Promise<AirbnbListingData> {
    const listingId = this.extractListingId(url);

    // Fetch the Airbnb page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new BadRequestException(`Impossibile accedere all'annuncio Airbnb: ${response.status}`);
    }

    const html = await response.text();

    // Extract JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    let structuredData: any = null;

    if (jsonLdMatch) {
      try {
        structuredData = JSON.parse(jsonLdMatch[1]);
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Extract data from meta tags and page content
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const descriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const cinMatch = html.match(/CIN[:\s]*([A-Z]{2}\d{6}[A-Z0-9]+)/i);

    // Extract photos from various sources
    const photos: string[] = [];
    const photoMatches = html.matchAll(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"'\s]+\.(?:jpeg|jpg|png|webp)/gi);
    for (const match of photoMatches) {
      const photoUrl = match[0].replace(/\\u002F/g, '/');
      if (!photos.includes(photoUrl) && photos.length < 20) {
        photos.push(photoUrl);
      }
    }

    // Extract location from structured data or page
    let location = {
      city: 'Lido di Pomposa',
      province: 'Ferrara',
      country: 'Italia',
      lat: undefined as number | undefined,
      lng: undefined as number | undefined,
    };

    if (structuredData?.address) {
      location.city = structuredData.address.addressLocality || location.city;
      location.province = structuredData.address.addressRegion || location.province;
      location.country = structuredData.address.addressCountry || location.country;
    }

    // Extract coordinates
    const latMatch = html.match(/"lat":\s*([\d.]+)/);
    const lngMatch = html.match(/"lng":\s*([\d.]+)/);
    if (latMatch) location.lat = parseFloat(latMatch[1]);
    if (lngMatch) location.lng = parseFloat(lngMatch[1]);

    // Extract room details
    const bedroomsMatch = html.match(/(\d+)\s*(?:camera|camere|bedroom)/i);
    const bathroomsMatch = html.match(/(\d+)\s*(?:bagno|bagni|bathroom)/i);
    const sleepsMatch = html.match(/(\d+)\s*(?:ospite|ospiti|guest)/i);

    // Extract amenities
    const amenities: string[] = [];
    const amenityPatterns = [
      /Wi-?Fi/gi, /aria condizionata/gi, /cucina/gi, /lavatrice/gi,
      /parcheggio/gi, /TV/gi, /riscaldamento/gi, /asciugacapelli/gi,
    ];
    for (const pattern of amenityPatterns) {
      if (pattern.test(html)) {
        amenities.push(pattern.source.replace(/[\\-?]/g, ''));
      }
    }

    return {
      id: listingId,
      title: titleMatch ? this.decodeHtmlEntities(titleMatch[1]) : `Proprietà ${listingId}`,
      description: descriptionMatch ? this.decodeHtmlEntities(descriptionMatch[1]) : '',
      location,
      bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : undefined,
      bathrooms: bathroomsMatch ? parseInt(bathroomsMatch[1]) : undefined,
      sleeps: sleepsMatch ? parseInt(sleepsMatch[1]) : undefined,
      amenities,
      photos,
      cin: cinMatch ? cinMatch[1] : undefined,
    };
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }

  async importFromAirbnb(url: string) {
    const listingData = await this.fetchListingData(url);

    // Check if already imported
    const existing = await this.prisma.property.findUnique({
      where: { airbnbId: listingData.id },
    });

    if (existing) {
      throw new BadRequestException('Questo immobile è già stato importato');
    }

    // Create property
    const property = await this.prisma.property.create({
      data: {
        title: listingData.title,
        description: listingData.description,
        type: 'APARTMENT',
        contractType: 'RENT',
        price: 0, // Da configurare manualmente
        bedrooms: listingData.bedrooms,
        bathrooms: listingData.bathrooms,
        sleeps: listingData.sleeps,
        airbnbId: listingData.id,
        airbnbUrl: url,
        cin: listingData.cin,
        location: {
          create: {
            address: listingData.location.city,
            city: listingData.location.city,
            province: listingData.location.province,
            country: listingData.location.country,
            lat: listingData.location.lat,
            lng: listingData.location.lng,
          },
        },
      },
      include: {
        location: true,
      },
    });

    // Import photos
    const mediaPromises = listingData.photos.slice(0, 10).map(async (photoUrl, index) => {
      try {
        // Upload to Cloudinary
        const uploadedUrl = await this.mediaService.uploadFromUrl(photoUrl, `property_${property.id}`);

        return this.prisma.propertyMedia.create({
          data: {
            propertyId: property.id,
            url: uploadedUrl,
            type: 'IMAGE',
            alt: `${listingData.title} - Foto ${index + 1}`,
          },
        });
      } catch (e) {
        // If upload fails, use original URL
        return this.prisma.propertyMedia.create({
          data: {
            propertyId: property.id,
            url: photoUrl,
            type: 'IMAGE',
            alt: `${listingData.title} - Foto ${index + 1}`,
          },
        });
      }
    });

    const media = await Promise.all(mediaPromises);

    // Create/connect amenities
    for (const amenityName of listingData.amenities) {
      await this.prisma.amenity.upsert({
        where: { name: amenityName },
        create: { name: amenityName },
        update: {},
      });
    }

    if (listingData.amenities.length > 0) {
      await this.prisma.property.update({
        where: { id: property.id },
        data: {
          amenities: {
            connect: listingData.amenities.map(name => ({ name })),
          },
        },
      });
    }

    return {
      property: await this.prisma.property.findUnique({
        where: { id: property.id },
        include: {
          location: true,
          media: true,
          amenities: true,
        },
      }),
      imported: {
        photos: media.length,
        amenities: listingData.amenities.length,
      },
    };
  }
}
