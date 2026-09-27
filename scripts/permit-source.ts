import { createHash } from 'node:crypto';

export const RESOURCE_ID = 'f4d1177a-f597-4c32-8cbf-7885f56253f6';
export const API_URL = 'https://data.wprdc.org/api/3/action/datastore_search';
export const DATASET_URL = 'https://data.wprdc.org/dataset/pli-permits';
export const FIELDS = [
  'permit_id', 'permit_type', 'work_description', 'work_type', 'issue_date',
  'parcel_num', 'address', 'latitude', 'longitude', 'neighborhood', 'status',
] as const;
export const SEED_IDS = [
  'BP-2020-11373', 'EP-2021-10918',
  'BDA-2024-03554', 'BP-2024-13992', 'BP-2024-13991',
  'BP-2024-13989', 'BP-2025-00108', 'SSP-2025-03861',
  'BDA-2026-05107',
  'BDA-2024-00844', 'BP-2023-03827', 'BP-2022-11140',
] as const;

export type PermitRecord = Record<(typeof FIELDS)[number], string | number | null>;

export function sanitizeDescription(input: unknown): string | null {
  if (input == null) return null;
  return String(input).trim()
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED EMAIL]')
    .replace(/(?<!\w)(?:\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}(?!\w)/g, '[REDACTED PHONE]');
}

export function sanitizeAddress(input: unknown): string | null {
  if (input == null) return null;
  // Parcel and street are sufficient for the local cohort; drop apartment/unit suffixes.
  return String(input).replace(/\s+(?:APT|UNIT|#)\s*[A-Z0-9-]+(?=,)/gi, '').trim();
}

export function canonicalRecords(records: PermitRecord[]): string {
  return JSON.stringify(records.map(row => Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key as keyof PermitRecord]]))));
}

export function recordsHash(records: PermitRecord[]): string {
  return createHash('sha256').update(canonicalRecords(records), 'utf8').digest('hex');
}
