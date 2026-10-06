import { CirclePause, Clock, Hourglass, MapPin, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { waitLabel } from '../lib/format.js';
import { Badge } from './ui.jsx';

export function TempleArt({ temple, className = 'h-36' }) {
  if (temple.imageUrl) {
    return <img src={temple.imageUrl} alt="" className={`${className} w-full object-cover`} />;
  }
  return (
    <div className={`${className} relative w-full overflow-hidden bg-linear-to-br from-saffron-700 via-saffron-800 to-temple-900`}>
      <svg
        viewBox="0 0 200 100"
        className="absolute inset-x-0 bottom-0 h-full w-full text-saffron-200/25"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M100 8 L112 30 H88 Z M84 30 H116 V38 H84 Z M76 38 H124 V48 H76 Z M66 48 H134 V60 H66 Z M50 60 H150 V100 H50 Z"
        />
        <path fill="currentColor" d="M20 70 L30 58 L40 70 V100 H20 Z M160 70 L170 58 L180 70 V100 H160 Z" />
      </svg>
      <span className="absolute left-4 top-3 font-display text-4xl text-white/90">
        {temple.name.replace(/^(Sri|Arulmigu)\s+/i, '').charAt(0)}
      </span>
    </div>
  );
}

export default function TempleCard({ temple }) {
  const live = temple.live;
  return (
    <Link
      to={`/temples/${temple.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <TempleArt temple={temple} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {live?.festival && (
            <Badge tone="saffron" icon={Sparkles}>
              {live.festival}
            </Badge>
          )}
          {live && !live.isOpen && <Badge tone="gray">Closed now</Badge>}
          {live?.entryPaused && (
            <Badge tone="red" icon={CirclePause}>
              Entry paused
            </Badge>
          )}
        </div>
        <h3 className="mt-2 text-xl text-temple-900 group-hover:text-saffron-800">{temple.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-temple-600">
          <MapPin className="size-4 text-temple-400" /> {temple.city}, {temple.state}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-temple-600">
          <Clock className="size-4 text-temple-400" /> {temple.openTime} – {temple.closeTime}
        </p>
        {live && live.isOpen && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-temple-100 pt-4 text-sm">
            <div>
              <p className="text-xs text-temple-500">General queue wait</p>
              <p className="flex items-center gap-1.5 font-semibold text-temple-900">
                <Hourglass className="size-4 text-saffron-700" /> {waitLabel(live.generalWaitMin)}
              </p>
            </div>
            <div>
              <p className="text-xs text-temple-500">In queue now</p>
              <p className="flex items-center gap-1.5 font-semibold text-temple-900">
                <Users className="size-4 text-saffron-700" /> {live.inQueue}
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
