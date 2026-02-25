const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface BookingInfo {
  id: string;
  propertyName: string;
  propertyImage?: string;
  propertyAddress?: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  guestName: string;
  checkInCompleted: boolean;
}

export interface CheckInFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  placeOfBirth?: string;
  documentType: 'passport' | 'id_card' | 'driving_license';
  documentNumber: string;
  documentIssueDate: string;
  documentExpiryDate: string;
  documentIssuedBy: string;
  email: string;
  phone: string;
  additionalGuests?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    documentType?: string;
    documentNumber?: string;
  }[];
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
  termsAccepted: boolean;
}

export async function getBookingInfo(bookingId: string): Promise<{
  valid: boolean;
  reason?: string;
  booking?: BookingInfo;
}> {
  const response = await fetch(`${API_URL}/checkin/${bookingId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch booking information');
  }

  return response.json();
}

export async function submitCheckIn(
  bookingId: string,
  data: CheckInFormData
): Promise<{
  success: boolean;
  error?: string;
  propertyName?: string;
  checkInDate?: string;
  checkOutDate?: string;
}> {
  const response = await fetch(`${API_URL}/checkin/${bookingId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.message || 'Failed to submit check-in');
  }

  return response.json();
}
