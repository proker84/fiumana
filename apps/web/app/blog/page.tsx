import SectionTitle from '../../components/SectionTitle';

export const metadata = {
  title: 'Blog & Guide',
};

const posts = [
  {
    title: 'Affitti brevi: come aumentare la redditività nel 2026',
    excerpt: 'Strategie di pricing dinamico, gestione recensioni e ottimizzazione del calendario.',
    date: '15 Dicembre 2025',
  },
  {
    title: 'Property management premium: KPI da monitorare',
    excerpt: 'Dati essenziali per mantenere il valore di un portafoglio immobiliare.',
    date: '02 Dicembre 2025',
  },
];

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle
        title="Insights e guide per proprietari"
        subtitle="Contenuti strategici su gestione, valorizzazione e trend immobiliari."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <article key={post.title} className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">{post.date}</p>
            <h3 className="mt-3 text-lg font-semibold text-white">{post.title}</h3>
            <p className="mt-3 text-sm text-white/60">{post.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
