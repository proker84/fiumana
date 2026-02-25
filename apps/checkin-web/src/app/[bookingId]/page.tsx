import { getBookingInfo } from "@/lib/api";
import { CheckInForm } from "@/components/CheckInForm";
import { Calendar, MapPin, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface CheckInPageProps {
  params: Promise<{ bookingId: string }>;
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { bookingId } = await params;

  let bookingData;
  let error: string | null = null;

  try {
    bookingData = await getBookingInfo(bookingId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Errore nel caricamento";
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-display font-semibold mb-2">
            Errore di caricamento
          </h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Invalid booking
  if (!bookingData?.valid || !bookingData.booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-display font-semibold mb-2">
            Check-in non disponibile
          </h1>
          <p className="text-slate-400">
            {bookingData?.reason || "Questa prenotazione non esiste o non è disponibile per il check-in."}
          </p>
        </div>
      </div>
    );
  }

  const booking = bookingData.booking;

  // Already completed
  if (booking.checkInCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-display font-semibold mb-2">
            Check-in già completato
          </h1>
          <p className="text-slate-400">
            Il check-in per questa prenotazione è stato già effettuato.
          </p>
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <p className="font-semibold">{booking.propertyName}</p>
            <p className="text-sm text-slate-400">
              {new Date(booking.checkInDate).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format dates
  const checkInDateFormatted = new Date(booking.checkInDate).toLocaleDateString(
    "it-IT",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
  const checkOutDateFormatted = new Date(booking.checkOutDate).toLocaleDateString(
    "it-IT",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Booking Info Card */}
      <div className="glass-card p-6 mb-8">
        <div className="flex gap-4">
          {booking.propertyImage ? (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={booking.propertyImage}
                alt={booking.propertyName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-cyan-400/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🏠</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-semibold truncate">
              {booking.propertyName}
            </h1>

            {booking.propertyAddress && (
              <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{booking.propertyAddress}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1 text-slate-300">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>{checkInDateFormatted}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{booking.guestCount} ospiti</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold gradient-text">
          Benvenuto, {booking.guestName}!
        </h2>
        <p className="text-slate-400 mt-2">
          Completa il check-in online per velocizzare il tuo arrivo
        </p>
      </div>

      {/* Check-in Form */}
      <CheckInForm booking={booking} />
    </div>
  );
}
