import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'immobiliare-fiumana-secret-key-change-in-production-2024';

export interface JWTPayload {
  userId: number;
  username: string;
  nome: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const cookie = req.cookies.get('auth_token');
  return cookie?.value || null;
}

export function authenticateRequest(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}
