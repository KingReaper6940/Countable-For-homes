/** Validate committed snapshot integrity without a network call. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIELDS, RESOURCE_ID, SEED_IDS, recordsHash, type PermitRecord } from './permit-source';

const dir = join(process.cwd(), 'data');
const snapshot = JSON.parse(readFileSync(join(dir, 'permits.snapshot.json'), 'utf8')) as {
  retrievedAt: string; resourceId: string; sha256: string; records: PermitRecord[];
};
const manifest = JSON.parse(readFileSync(join(dir, 'source-manifest.json'), 'utf8')) as {
  retrievedAt: string; resourceId: string; recordCount: number; contentSha256: string; queries: unknown[];
};
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const records = snapshot.records;
const actualIds = records.map(row => row.permit_id);
assert(records.length === SEED_IDS.length, 'Unexpected duplicate or missing records');
assert(SEED_IDS.every(id => actualIds.includes(id)), 'Seed IDs differ');
assert(records.every(row => FIELDS.every(field => Object.hasOwn(row, field)) && Object.keys(row).length === FIELDS.length), 'Missing or unallowlisted field');
assert(snapshot.resourceId === RESOURCE_ID && manifest.resourceId === RESOURCE_ID, 'Resource ID mismatch');
assert(snapshot.retrievedAt === manifest.retrievedAt, 'Retrieval timestamp mismatch');
assert(manifest.recordCount === records.length && manifest.queries.length === SEED_IDS.length, 'Manifest query or count mismatch');
const expectedParcel: Record<string, string> = {
  'BP-2020-11373':'0012K00286000000','EP-2021-10918':'0012K00286000000',
  'BDA-2024-03554':'0010C00100000000','BP-2024-13992':'0010C00100000000',
  'BP-2024-13991':'0010C00100000000','BP-2024-13989':'0010C00100000000',
  'BP-2025-00108':'0010C00100000000','SSP-2025-03861':'0010C00100000000',
  'BDA-2026-05107':'0010C00100000000',
  'BDA-2024-00844':'0026J00180000000','BP-2023-03827':'0051G00233000000',
  'BP-2022-11140':'0009N00031000000',
};
assert(records.every(row => row.parcel_num === expectedParcel[String(row.permit_id)]), 'Unexpected parcel');
assert(records.every(row => !String(row.work_description ?? '').includes('@')), 'Description may contain an email address');
assert(records.every(row => !/\s+(?:APT|UNIT|#)\s*[A-Z0-9-]+,/i.test(String(row.address ?? ''))), 'Address contains a unit suffix');
const digest = recordsHash(records);
assert(digest === snapshot.sha256 && digest === manifest.contentSha256, 'Content hash mismatch');
console.log(`Validated ${records.length} records, ${SEED_IDS.length} IDs; SHA-256 ${digest}`);
