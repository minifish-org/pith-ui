import {rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// Removed test files must not survive as executable stale build output.
await rm(fileURLToPath(new URL('../test-dist',import.meta.url)),{recursive:true,force:true});
