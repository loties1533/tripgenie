export const MODES = {
  PARTY:    'party',
  STUDENT:  'student',
  LUXURY:   'luxury',
  GROUP:    'group',
  RELAX:    'relax',
  SURPRISE: 'surprise',
};

export const MODES_LIST = Object.values(MODES);

export const BUDGET_RATIOS = {
  [MODES.PARTY]:    { vols: 0.25, heberg: 0.25, activites: 0.25, resto: 0.12, trans: 0.08 },
  [MODES.STUDENT]:  { vols: 0.35, heberg: 0.30, activites: 0.10, resto: 0.15, trans: 0.05 },
  [MODES.LUXURY]:   { vols: 0.20, heberg: 0.45, activites: 0.20, resto: 0.10, trans: 0.03 },
  [MODES.GROUP]:    { vols: 0.30, heberg: 0.35, activites: 0.15, resto: 0.12, trans: 0.05 },
  [MODES.RELAX]:    { vols: 0.22, heberg: 0.40, activites: 0.15, resto: 0.13, trans: 0.07 },
  [MODES.SURPRISE]: { vols: 0.28, heberg: 0.32, activites: 0.18, resto: 0.13, trans: 0.06 },
};

export const TRIP_STATUS = {
  DRAFT:     'draft',
  CONFIRMED: 'confirmed',
  ARCHIVED:  'archived',
};

export const TRIP_STATUS_LIST = Object.values(TRIP_STATUS);

export const DEFAULT_VALUES = {
  ORIGIN:    'Paris',
  TRAVELERS: 2,
  NIGHTS:    4,
  MODE:      MODES.PARTY,
};
