"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostSchema = exports.LeadSchema = exports.PropertySchema = exports.AmenitySchema = exports.LocationSchema = exports.LeadSourceEnum = exports.ContractTypeEnum = exports.PropertyTypeEnum = void 0;
const zod_1 = require("zod");
exports.PropertyTypeEnum = zod_1.z.enum(['RESIDENTIAL', 'COMMERCIAL', 'VACATION']);
exports.ContractTypeEnum = zod_1.z.enum(['LONG_TERM', 'SHORT_TERM']);
exports.LeadSourceEnum = zod_1.z.enum(['CONTACT', 'OWNER', 'VALUATION']);
exports.LocationSchema = zod_1.z.object({
    address: zod_1.z.string().min(3),
    city: zod_1.z.string().min(2),
    province: zod_1.z.string().min(1),
    country: zod_1.z.string().default('Italia'),
    lat: zod_1.z.number().optional(),
    lng: zod_1.z.number().optional(),
});
exports.AmenitySchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
});
exports.PropertySchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    type: exports.PropertyTypeEnum,
    contractType: exports.ContractTypeEnum,
    price: zod_1.z.number().nonnegative(),
    areaSqm: zod_1.z.number().nonnegative().optional(),
    bedrooms: zod_1.z.number().int().nonnegative().optional(),
    bathrooms: zod_1.z.number().int().nonnegative().optional(),
    sleeps: zod_1.z.number().int().nonnegative().optional(),
    isFeatured: zod_1.z.boolean().default(false),
    location: exports.LocationSchema,
    amenities: zod_1.z.array(exports.AmenitySchema).default([]),
    mediaUrls: zod_1.z.array(zod_1.z.string().url()).default([]),
});
exports.LeadSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(6).optional(),
    message: zod_1.z.string().min(10),
    source: exports.LeadSourceEnum,
    city: zod_1.z.string().optional(),
    propertyType: zod_1.z.string().optional(),
    availability: zod_1.z.string().optional(),
});
exports.PostSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(3),
    slug: zod_1.z.string().min(3),
    excerpt: zod_1.z.string().min(10),
    content: zod_1.z.string().min(50),
    coverImage: zod_1.z.string().url().optional(),
    published: zod_1.z.boolean().default(false),
});
//# sourceMappingURL=index.js.map