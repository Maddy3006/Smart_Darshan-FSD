import { CROWD_LEVELS, TOKEN_STATUS } from '../lib/constants.js';
import { Badge } from './ui.jsx';

export function TokenStatusBadge({ status }) {
  const config = TOKEN_STATUS[status] || { label: status, tone: 'gray' };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export function CrowdLevelBadge({ level, short = false }) {
  const config = CROWD_LEVELS[level];
  if (!config) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-temple-700">
      <span className="size-2.5 rounded-full" style={{ background: config.color }} aria-hidden="true" />
      {short ? config.short : config.label}
    </span>
  );
}

export function LiveDot({ connected = true, label }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-temple-600">
      <span className={connected ? 'live-dot size-2 rounded-full bg-emerald-500' : 'size-2 rounded-full bg-temple-300'} />
      {label ?? (connected ? 'Live' : 'Reconnecting...')}
    </span>
  );
}
