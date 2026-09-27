import { getCoverage, listProjects } from '../src/lib/db';

const result=listProjects();
console.log(`COUNTABLE seed ready: ${getCoverage().recordCount} real permit records, ${result.projects.length} projects.`);
console.log('Persistent review state: .countable/countable.db');
