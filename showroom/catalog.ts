import {partCases} from './parts-cases.js';
import type {ShowcaseCase} from './types.js';
/** Public exhibits contain formal parts only. Complete compositions are internal
 * validation fixtures and executable assembly documentation, never showroom APIs. */
export const catalog:readonly ShowcaseCase[]=partCases;
const ids=new Set<string>();
for(const item of catalog){if(ids.has(item.id))throw new Error('Duplicate showcase id: '+item.id);ids.add(item.id);if(!item.factories?.length||!item.code)throw new Error('Part exhibit lacks an executable specification: '+item.id);}
