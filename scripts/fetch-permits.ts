/** Refresh the pinned, sanitized CKAN snapshot. Run: npm run fetch:permits */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { API_URL, DATASET_URL, FIELDS, RESOURCE_ID, SEED_IDS, recordsHash, sanitizeAddress, sanitizeDescription, type PermitRecord } from './permit-source';

type CkanPayload = { success: boolean; result?: { total: number; records: Record<string, unknown>[] } };

async function fetchOne(permitId: string): Promise<{ rows: PermitRecord[]; url: string }> {
  const url = new URL(API_URL);
  url.searchParams.set('resource_id', RESOURCE_ID);
  url.searchParams.set('filters', JSON.stringify({ permit_id: permitId }));
  url.searchParams.set('fields', FIELDS.join(','));
  url.searchParams.set('limit', '100');
  url.searchParams.set('offset', '0');
  const response = await fetch(url, { headers: { 'User-Agent': 'COUNTABLE-hackathon-prototype/1.0' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`CKAN HTTP ${response.status} for ${permitId}`);
  const payload = await response.json() as CkanPayload;
  if (!payload.success || !payload.result) throw new Error(`CKAN query failed for ${permitId}`);
  if (payload.result.total > 100) throw new Error(`Pagination required for ${permitId}; refusing incomplete snapshot`);
  const rows = payload.result.records.map(raw => {
    const row = Object.fromEntries(FIELDS.map(field => [field, raw[field] ?? null])) as PermitRecord;
    row.work_description = sanitizeDescription(row.work_description);
    row.address = sanitizeAddress(row.address);
    return row;
  });
  if (!rows.length) throw new Error(`Missing seed permit: ${permitId}`);
  return { rows, url: url.toString() };
}

async function main() {
  const records: PermitRecord[] = [];
  const queries: { permit_id: string; url: string; returnedRows: number }[] = [];
  for (const permitId of SEED_IDS) {
    const { rows, url } = await fetchOne(permitId);
    records.push(...rows);
    queries.push({ permit_id: permitId, url, returnedRows: rows.length });
  }
  records.sort((a, b) => String(a.permit_id).localeCompare(String(b.permit_id)) || String(a.issue_date ?? '').localeCompare(String(b.issue_date ?? '')));
  const retrievedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const sha256 = recordsHash(records);
  const query = 'datastore_search GET; one permit_id equality filter per seed ID; fields limited to FIELDS; limit=100, offset=0';
  const snapshot = { retrievedAt, sourceUrl: DATASET_URL, resourceId: RESOURCE_ID, query, sha256, records };
  const manifest = {
    retrievedAt, sourceUrl: DATASET_URL, apiUrl: API_URL, resourceId: RESOURCE_ID,
    fields: [...FIELDS], seedPermitIds: [...SEED_IDS], queries,
    cohortSelection: {
      discoveryUrl: `${API_URL}?resource_id=${RESOURCE_ID}&q=UNITS&fields=${encodeURIComponent(FIELDS.join(','))}&limit=100&offset=0`,
      criterion: 'From the first 100 q=UNITS results, select three permits on distinct parcels with explicit unit mentions that illustrate resulting use, possible but unverified unit reduction, and revoked work; then re-fetch each by exact permit_id.',
      cohortPermitIds: ['BDA-2024-00844', 'BP-2023-03827', 'BP-2022-11140'],
    },
    recordCount: records.length, contentSha256: sha256,
    hashMethod: 'SHA-256 of UTF-8 JSON records with object keys sorted alphabetically and no extra whitespace',
    sanitization: 'Only allowlisted fields requested; email addresses and telephone numbers in descriptions replaced; apartment/unit suffixes removed from addresses. Manual inspection still required for incidental names.',
  };
  const dir = join(process.cwd(), 'data');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'permits.snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  await writeFile(join(dir, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Saved ${records.length} records for ${SEED_IDS.length} permit IDs at ${retrievedAt}; SHA-256 ${sha256}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
