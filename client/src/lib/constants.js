export const TOKEN_STATUS = {
  booked: { label: 'Booked', tone: 'blue' },
  checked_in: { label: 'In queue', tone: 'amber' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  expired: { label: 'Expired', tone: 'red' },
};

// Chart colours, checked with the data-viz palette validator (CVD-safe pair, >= 3:1 on white).
// Crowd levels use the reserved status colours and are always shown with a text label.
export const CHART_COLORS = {
  actual: '#c2410c',
  predicted: '#2a78d6',
  festival: '#2a78d6',
  grid: '#ece5dc',
  axis: '#898781',
  baseline: '#e6dacb',
  // single-hue sequential ramp (light -> dark) for the heatmap
  heat: ['#fdf0e3', '#fbd9b8', '#f8b983', '#f29450', '#e06d25', '#bf4d10', '#8f340b'],
};

export const CROWD_LEVELS = {
  low: { label: 'Low crowd', short: 'Low', color: '#0ca30c', tone: 'green' },
  moderate: { label: 'Moderate crowd', short: 'Moderate', color: '#fab219', tone: 'amber' },
  high: { label: 'High crowd', short: 'High', color: '#d03b3b', tone: 'red' },
};

export const ROLE_LABELS = {
  devotee: 'Devotee',
  staff: 'Gate staff',
  admin: 'Temple admin',
  superadmin: 'Superadmin',
};

export function homePathFor(user) {
  switch (user?.role) {
    case 'staff':
      return '/staff/scan';
    case 'admin':
      return '/admin';
    case 'superadmin':
      return '/super';
    default:
      return '/';
  }
}

export const isConsoleRole = (role) => ['staff', 'admin', 'superadmin'].includes(role);
