import {arePotentialDuplicates} from '../../src/events/event-deduplication.js';
// Evaluate the real repository predicate without calling its destructive merge routine.
// Complete-link presentation in grouping.mjs is shared by both methods for a fair comparison.
export const baseline=(a,b)=>({state:arePotentialDuplicates(a,b)?'match':'separate',reasons:['imported arePotentialDuplicates; original boolean predicate'],score:null});
