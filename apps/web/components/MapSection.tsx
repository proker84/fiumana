'use client';

import { useEffect, useRef } from 'react';

export default function MapSection() {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !mapContainer.current) {
      return;
    }

    let map: any;
    (async () => {
      const mapboxgl = await import('mapbox-gl');
      mapboxgl.default.accessToken = token;
      map = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [12.5695, 44.0678],
        zoom: 10.5,
      });
    })();

    return () => {
      if (map) map.remove();
    };
  }, []);

  const fallback = (
    <iframe
      title="Mappa Immobiliare Fiumana"
      className="h-full w-full rounded-3xl"
      loading="lazy"
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2883.4598793269064!2d12.563!3d44.0678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x132cc2b23b08d3d7%3A0x2c4e4d5a44b1d2a0!2sRimini!5e0!3m2!1sit!2sit!4v1700000000000"
    />
  );

  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
        <div className="glass rounded-3xl p-8">
          <h3 className="text-2xl font-display">Presidio locale, visione digitale</h3>
          <p className="mt-4 text-sm text-white/60">
            Gestiamo immobili in Emilia-Romagna e nelle principali città costiere. La copertura è pronta
            per espandersi con una rete di partner selezionati.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/70">
            <li>Rimini • Riccione • Cesenatico</li>
            <li>Bologna • Ravenna • Cesena</li>
            <li>Proprietà premium e corporate leasing</li>
          </ul>
        </div>
        <div className="glass rounded-3xl p-2">
          {hasToken ? (
            <div ref={mapContainer} className="h-72 w-full rounded-3xl" />
          ) : (
            <div className="h-72 w-full rounded-3xl overflow-hidden">{fallback}</div>
          )}
        </div>
      </div>
    </section>
  );
}
