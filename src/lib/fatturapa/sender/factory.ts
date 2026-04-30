/**
 * Factory che restituisce l'implementazione corretta di InvoiceSender
 * basandosi sulle invoice_settings.
 *
 * In dev/test si usa MockSender. La vera implementazione AcubeSender
 * verrà fornita nel task #12; per ora la factory fa fallback a Mock se
 * `senderProvider` è 'acube' ma il modulo `./acube` non è ancora presente.
 */

import type { InvoiceSender, InvoiceSettings } from '../types';
import { AcubeSender } from './acube';
import { MockSender } from './mock';
import { OpenapiSender } from './openapi';

export interface SenderResolution {
  sender: InvoiceSender;
  reason: 'mock' | 'acube' | 'openapi';
}

/**
 * Risolve il sender da usare in base alle invoice_settings.
 *
 * Priorità:
 *   1. provider esplicito 'mock' → MockSender (per dev/test, non invia al SDI)
 *   2. provider 'acube' → AcubeSender (canone fisso, OAuth2 password grant)
 *   3. provider 'openapi' → OpenapiSender (pay-per-use, Basic auth + token con scopes)
 *   4. fallback → MockSender
 */
export function resolveSender(settings: InvoiceSettings): SenderResolution {
  const provider = settings.senderProvider ?? 'mock';

  if (provider === 'acube') {
    return { sender: new AcubeSender(settings), reason: 'acube' };
  }

  if (provider === 'openapi') {
    return { sender: new OpenapiSender(settings), reason: 'openapi' };
  }

  return { sender: new MockSender({ scenario: 'success' }), reason: 'mock' };
}
