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

export interface SenderResolution {
  sender: InvoiceSender;
  reason: 'mock' | 'acube';
}

/**
 * Risolve il sender da usare in base alle invoice_settings.
 *
 * Priorità:
 *   1. provider esplicito 'mock' → MockSender
 *   2. provider 'acube' → AcubeSender (anche se senderTestMode=true: l'endpoint
 *      sandbox è già parametrizzato da senderEndpoint, è sufficiente quello)
 *   3. fallback → MockSender
 */
export function resolveSender(settings: InvoiceSettings): SenderResolution {
  const provider = settings.senderProvider ?? 'mock';

  if (provider === 'acube') {
    return { sender: new AcubeSender(settings), reason: 'acube' };
  }

  return { sender: new MockSender({ scenario: 'success' }), reason: 'mock' };
}
