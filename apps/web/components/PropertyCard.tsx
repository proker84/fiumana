import Image from 'next/image';

interface PropertyCardProps {
  title: string;
  city: string;
  type: string;
  price: string;
  image: string;
}

export default function PropertyCard({ title, city, type, price, image }: PropertyCardProps) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="relative h-48">
        <Image src={image} alt={title} fill className="object-cover" />
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan/70">{type}</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/60">{city}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/60">Canone</span>
          <span className="text-cyan">{price}</span>
        </div>
      </div>
    </div>
  );
}
