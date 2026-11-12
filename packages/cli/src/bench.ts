import { mulberry32 } from '@ctc/engine';

const rng = mulberry32(1);
console.log('engine linked, first rng value:', rng());
