/**
 * Helper di mapping fra le righe DB (snake_case) e i tipi del modulo (camelCase).
 *
 * Centralizziamo qui le conversioni perché vengono usate da tutte le route
 * /api/invoices/*. Uso `any` come tipo input perché il client libsql ritorna
 * `Record<string, unknown>` e fare cast specifici sarebbe verboso e fragile.
 */

import type { Customer, Invoice, InvoiceItem } from './types';

export function rowToCustomer(r: any): Customer | null {
  if (!r) return null;
  return {
    id: Number(r.id),
    tipo: r.tipo as Customer['tipo'],
    ragioneSociale: r.ragione_sociale ?? null,
    cognome: r.cognome ?? null,
    nome: r.nome ?? null,
    codiceFiscale: r.codice_fiscale ?? null,
    partitaIva: r.partita_iva ?? null,
    nazione: r.nazione ?? 'IT',
    indirizzo: r.indirizzo ?? null,
    cap: r.cap ?? null,
    comune: r.comune ?? null,
    provincia: r.provincia ?? null,
    email: r.email ?? null,
    pec: r.pec ?? null,
    codiceDestinatario: r.codice_destinatario ?? '0000000',
    isEstero: !!r.is_estero,
    sourceGuestId: r.source_guest_id ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  };
}

export function rowToInvoice(r: any): Invoice | null {
  if (!r) return null;
  return {
    id: Number(r.id),
    tipoDocumento: r.tipo_documento,
    sezionale: r.sezionale,
    numero: r.numero ?? null,
    anno: r.anno ?? null,
    numeroCompleto: r.numero_completo ?? null,
    dataDocumento: r.data_documento,
    bookingId: r.booking_id ?? null,
    customerId: Number(r.customer_id),
    parentInvoiceId: r.parent_invoice_id ?? null,
    idempotencyKey: r.idempotency_key ?? null,
    imponibileCents: Number(r.imponibile_cents),
    ivaCents: Number(r.iva_cents),
    totaleCents: Number(r.totale_cents),
    aliquotaIva: Number(r.aliquota_iva),
    naturaIva: r.natura_iva ?? null,
    bookingTotalCents: r.booking_total_cents ?? null,
    cityTaxCents: r.city_tax_cents ?? null,
    airbnbCommissionCents: r.airbnb_commission_cents ?? null,
    modalitaPagamento: r.modalita_pagamento ?? 'MP08',
    dataPagamento: r.data_pagamento ?? null,
    stato: r.stato,
    markingAcube: r.marking_acube ?? null,
    externalId: r.external_id ?? null,
    sdiIdentificativo: r.sdi_identificativo ?? null,
    xmlUrl: r.xml_url ?? null,
    xmlFilename: r.xml_filename ?? null,
    pdfUrl: r.pdf_url ?? null,
    ricevutaConsegnaUrl: r.ricevuta_consegna_url ?? null,
    inviataAt: r.inviata_at ? new Date(r.inviata_at) : null,
    consegnataAt: r.consegnata_at ? new Date(r.consegnata_at) : null,
    lastPolledAt: r.last_polled_at ? new Date(r.last_polled_at) : null,
    pollAttempts: Number(r.poll_attempts ?? 0),
    notes: r.notes ?? null,
    createdBy: r.created_by ?? null,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  };
}

export function rowToInvoiceItem(r: any): InvoiceItem {
  return {
    id: Number(r.id),
    invoiceId: Number(r.invoice_id),
    rigaNumero: Number(r.riga_numero),
    descrizione: r.descrizione,
    quantita: Number(r.quantita ?? 1),
    prezzoUnitarioCents: Number(r.prezzo_unitario_cents),
    aliquotaIva: Number(r.aliquota_iva ?? 10),
    naturaIva: r.natura_iva ?? null,
    imponibileCents: Number(r.imponibile_cents),
    ivaCents: Number(r.iva_cents),
    totaleCents: Number(r.totale_cents),
  };
}

export function rowToInvoiceSettings(r: any) {
  if (!r) return null;
  return {
    id: 1 as const,
    ragioneSociale: r.ragione_sociale,
    partitaIva: r.partita_iva,
    codiceFiscale: r.codice_fiscale,
    regimeFiscale: r.regime_fiscale,
    indirizzo: r.indirizzo,
    cap: r.cap,
    comune: r.comune,
    provincia: r.provincia,
    nazione: r.nazione,
    iban: r.iban ?? null,
    rea: r.rea ?? null,
    capitaleSocialeCents: r.capitale_sociale_cents ?? null,
    pecEmittente: r.pec_emittente ?? null,
    senderProvider: r.sender_provider ?? null,
    senderApiKeyEncrypted: r.sender_api_key_encrypted ?? null,
    senderEndpoint: r.sender_endpoint ?? null,
    senderTestMode: !!r.sender_test_mode,
    webhookSecret: r.webhook_secret ?? null,
    acubeBusinessRegistryUuid: r.acube_business_registry_uuid ?? null,
    acubeNumberingSequenceUuid: r.acube_numbering_sequence_uuid ?? null,
    acubeNumberingSequenceName: r.acube_numbering_sequence_name ?? 'FiumanaAIR',
    acubeCreditNoteSequenceUuid: r.acube_credit_note_sequence_uuid ?? null,
    acubeCreditNoteSequenceName: r.acube_credit_note_sequence_name ?? 'FiumanaAIRNC',
    conservazioneProvider: r.conservazione_provider ?? null,
    tassaSoggiornoDefaultCents: Number(r.tassa_soggiorno_default_cents ?? 200),
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  };
}
