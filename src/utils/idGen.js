let counter = 10000;

export const genNodeId = () =>
  `n_${++counter}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const genProjectId = () =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
