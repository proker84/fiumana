import { z } from 'zod';

export const PropertyTypeEnum = z.enum(['RESIDENTIAL', 'COMMERCIAL', 'VACATION']);
export const ContractTypeEnum = z.enum(['LONG_TERM', 'SHORT_TERM']);

export const LeadSourceEnum = z.enum(['CONTACT', 'OWNER', 'VALUATION']);

export const LocationSchema = z.object({
  address: z.string().min(3),
  city: z.string().min(2),
  province: z.string().min(1),
  country: z.string().default('Italia'),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const AmenitySchema = z.object({
  name: z.string().min(2),
});

export const PropertySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  type: PropertyTypeEnum,
  contractType: ContractTypeEnum,
  price: z.number().nonnegative(),
  areaSqm: z.number().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  sleeps: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().default(false),
  location: LocationSchema,
  amenities: z.array(AmenitySchema).default([]),
  mediaUrls: z.array(z.string().url()).default([]),
});

export const LeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).optional(),
  message: z.string().min(10),
  source: LeadSourceEnum,
  city: z.string().optional(),
  propertyType: z.string().optional(),
  availability: z.string().optional(),
});

export const PostSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3),
  slug: z.string().min(3),
  excerpt: z.string().min(10),
  content: z.string().min(50),
  coverImage: z.string().url().optional(),
  published: z.boolean().default(false),
});

export type PropertyInput = z.infer<typeof PropertySchema>;
export type LeadInput = z.infer<typeof LeadSchema>;
export type PostInput = z.infer<typeof PostSchema>;
