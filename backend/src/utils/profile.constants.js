const LEGACY_PLAYER_POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward'];

const GRANULAR_PLAYER_POSITIONS = [
  'Goalkeeper',
  'Center Back',
  'Left Center Back',
  'Right Center Back',
  'Full Back',
  'Wing Back',
  'Defensive Midfielder',
  'Central Midfielder',
  'Attacking Midfielder',
  'Wide Midfielder',
  'Winger',
  'Inside Forward',
  'Striker',
  'False 9',
  'Sweeper',
];

const PLAYER_POSITION_VALUES = [...LEGACY_PLAYER_POSITIONS, ...GRANULAR_PLAYER_POSITIONS];

const AVAILABILITY_STATUSES = ['Available', 'Contracted', 'Injured', 'On Trial'];

module.exports = {
  LEGACY_PLAYER_POSITIONS,
  GRANULAR_PLAYER_POSITIONS,
  PLAYER_POSITION_VALUES,
  AVAILABILITY_STATUSES,
};