"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { submitCheckIn, BookingInfo } from "@/lib/api";
import {
  User,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";

const checkInSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  dateOfBirth: z.string().min(1, "Data di nascita richiesta"),
  nationality: z.string().min(1, "Nazionalità richiesta"),
  placeOfBirth: z.string().optional(),
  documentType: z.enum(["passport", "id_card", "driving_license"]),
  documentNumber: z.string().min(1, "Numero documento richiesto"),
  documentIssueDate: z.string().min(1, "Data rilascio richiesta"),
  documentExpiryDate: z.string().min(1, "Data scadenza richiesta"),
  documentIssuedBy: z.string().min(1, "Ente rilascio richiesto"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(1, "Telefono richiesto"),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: "Devi accettare l'informativa privacy",
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Devi accettare i termini e condizioni",
  }),
  marketingAccepted: z.boolean().optional(),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

interface CheckInFormProps {
  booking: BookingInfo;
}

const STEPS = [
  { id: 1, title: "Dati personali", icon: User },
  { id: 2, title: "Documento", icon: FileText },
  { id: 3, title: "Conferma", icon: CheckCircle },
];

export function CheckInForm({ booking }: CheckInFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
  } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      documentType: "id_card",
      privacyAccepted: false,
      termsAccepted: false,
      marketingAccepted: false,
    },
  });

  const formValues = watch();

  const nextStep = async () => {
    let fieldsToValidate: (keyof CheckInFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        "firstName",
        "lastName",
        "dateOfBirth",
        "nationality",
        "email",
        "phone",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = [
        "documentType",
        "documentNumber",
        "documentIssueDate",
        "documentExpiryDate",
        "documentIssuedBy",
      ];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: CheckInFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitCheckIn(booking.id, data);

      if (result.success) {
        router.push(`/success?property=${encodeURIComponent(booking.propertyName)}`);
      } else {
        setSubmitError(result.error || "Errore durante l'invio del check-in");
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Errore sconosciuto"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`step-indicator ${
                    isActive ? "active" : isCompleted ? "completed" : "pending"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 ${
                    isActive ? "text-cyan-400" : "text-slate-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-green-500" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Personal Data */}
        {currentStep === 1 && (
          <div className="glass-card p-6 space-y-4 animate-fade-in">
            <h2 className="text-xl font-display font-semibold gradient-text">
              Dati personali
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Nome *
                </label>
                <input
                  {...register("firstName")}
                  className="w-full px-4 py-3 rounded-lg border"
                  placeholder="Mario"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Cognome *
                </label>
                <input
                  {...register("lastName")}
                  className="w-full px-4 py-3 rounded-lg border"
                  placeholder="Rossi"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Data di nascita *
                </label>
                <input
                  {...register("dateOfBirth")}
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border"
                />
                {errors.dateOfBirth && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Nazionalità *
                </label>
                <select
                  {...register("nationality")}
                  className="w-full px-4 py-3 rounded-lg border"
                >
                  <option value="">Seleziona nazionalità</option>
                  <option value="IT">Italia</option>
                  <option value="DE">Germania</option>
                  <option value="FR">Francia</option>
                  <option value="GB">Regno Unito</option>
                  <option value="ES">Spagna</option>
                  <option value="US">Stati Uniti</option>
                  <option value="OTHER">Altro</option>
                </select>
                {errors.nationality && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.nationality.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border"
                  placeholder="mario.rossi@email.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Telefono *
                </label>
                <input
                  {...register("phone")}
                  type="tel"
                  className="w-full px-4 py-3 rounded-lg border"
                  placeholder="+39 123 456 7890"
                />
                {errors.phone && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Document */}
        {currentStep === 2 && (
          <div className="glass-card p-6 space-y-4 animate-fade-in">
            <h2 className="text-xl font-display font-semibold gradient-text">
              Documento di identità
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Tipo documento *
                </label>
                <select
                  {...register("documentType")}
                  className="w-full px-4 py-3 rounded-lg border"
                >
                  <option value="id_card">Carta d&apos;identità</option>
                  <option value="passport">Passaporto</option>
                  <option value="driving_license">Patente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Numero documento *
                </label>
                <input
                  {...register("documentNumber")}
                  className="w-full px-4 py-3 rounded-lg border"
                  placeholder="AB1234567"
                />
                {errors.documentNumber && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.documentNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Data rilascio *
                </label>
                <input
                  {...register("documentIssueDate")}
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border"
                />
                {errors.documentIssueDate && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.documentIssueDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Data scadenza *
                </label>
                <input
                  {...register("documentExpiryDate")}
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border"
                />
                {errors.documentExpiryDate && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.documentExpiryDate.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">
                  Rilasciato da *
                </label>
                <input
                  {...register("documentIssuedBy")}
                  className="w-full px-4 py-3 rounded-lg border"
                  placeholder="Comune di Roma"
                />
                {errors.documentIssuedBy && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.documentIssuedBy.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <div className="glass-card p-6 space-y-6 animate-fade-in">
            <h2 className="text-xl font-display font-semibold gradient-text">
              Conferma e consensi
            </h2>

            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nome</span>
                <span>
                  {formValues.firstName} {formValues.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span>{formValues.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Telefono</span>
                <span>{formValues.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Documento</span>
                <span>{formValues.documentNumber}</span>
              </div>
            </div>

            {/* Consents */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("privacyAccepted")}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                />
                <span className="text-sm text-slate-300">
                  Ho letto e accetto l&apos;
                  <a href="#" className="text-cyan-400 underline">
                    Informativa sulla Privacy
                  </a>{" "}
                  *
                </span>
              </label>
              {errors.privacyAccepted && (
                <p className="text-red-400 text-sm">
                  {errors.privacyAccepted.message}
                </p>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("termsAccepted")}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                />
                <span className="text-sm text-slate-300">
                  Accetto i{" "}
                  <a href="#" className="text-cyan-400 underline">
                    Termini e Condizioni
                  </a>{" "}
                  e le regole della struttura *
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-red-400 text-sm">
                  {errors.termsAccepted.message}
                </p>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("marketingAccepted")}
                  className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                />
                <span className="text-sm text-slate-300">
                  Acconsento a ricevere comunicazioni promozionali
                </span>
              </label>
            </div>

            {submitError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Indietro
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary flex items-center gap-2"
            >
              Avanti
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Completa Check-in
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
