/**
 * Re-export del contratto sender per importazioni più pulite:
 *
 *   import type { InvoiceSender } from '@/lib/fatturapa/sender/interface';
 *
 * I tipi vivono in `../types.ts` per evitare cicli.
 */

export type {
  InvoiceSender,
  SendContext,
  SendResult,
  SdiStatus,
  SdiLogEventType,
  AcubeMarking,
  SdiNotificationOutcome,
} from '../types';
