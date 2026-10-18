import {recipeCases} from './recipe-cases.js';
import {partCases} from './parts-cases.js';
import type {ShowcaseCase} from './types.js';
/** Parts and shared regions use the same public package entries. */
export const catalog:readonly ShowcaseCase[]=[...partCases,...recipeCases];
const ids=new Set<string>();
for(const item of catalog){if(ids.has(item.id))throw new Error('Duplicate showcase id: '+item.id);ids.add(item.id);if(!item.factories?.length||!item.code)throw new Error('Part exhibit lacks an executable specification: '+item.id);}
