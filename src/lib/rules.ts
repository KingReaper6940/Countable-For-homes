import type { Claim, Evidence, HousingEvent, Relationship, SourceRecord } from './types';
import { createHash } from 'node:crypto';

/** A model quote is evidence only when it occurs in the supplied source verbatim. */
export function supportedQuote(source: string, quote: string): boolean {
  return quote.trim().length >= 4 && source.toLocaleLowerCase().includes(quote.trim().toLocaleLowerCase());
}

export function findBuildingLabel(text: string): string | null {
  const match = text.match(/\b(?:building|bldg\.?)\b\s+(?:(?:number|no\.?)\s+)?([a-z]\d{0,2}|\d{1,2})\b/i);
  return match ? match[1].toUpperCase() : null;
}

export function extractPermitReferences(text: string): string[] {
  return [...new Set((text.match(/\b(?:BDA|BP|EP|SSP)-\d{4}-\d{4,6}\b/gi) ?? []).map(x => x.toUpperCase()))];
}

/** Deliberately conservative: ambiguous numeric mentions abstain rather than become additions. */
export function extractClaims(record: SourceRecord): Claim[] {
  const text = record.description;
  const result: Claim[] = [];
  const add = (kind: Claim['kind'], units: number, quote: string) => {
    if (Number.isInteger(units) && units >= 0 && supportedQuote(text, quote) && !result.some(x => x.kind === kind && x.units === units && x.quote === quote)) {
      const hash=createHash('sha256').update(`${kind}|${units}|${quote}`).digest('hex').slice(0,12);
      result.push({ id: `${record.id}:${kind}:${units}:${hash}`, recordId: record.id, kind, units, quote, reviewStatus: 'proposed' });
    }
  };
  const patterns: { kind: Claim['kind']; re: RegExp }[] = [
    { kind: 'addition', re: /\badd\s+a\s+dwelling\s+unit\b/gi },
    { kind: 'addition', re: /\b(?:adding|add|additional|new)\s+(\d{1,3})\s+(?:residential\s+)?(?:dwelling\s+)?(?:units?|apartments?|homes?)\b/gi },
    { kind: 'addition', re: /\b(?:convert\w*|conversion)\b.{0,100}?\b(?:add|adding)\s+(\d{1,3})\s+(?:dwelling\s+)?(?:units?|apartments?)\b/gi },
    { kind: 'existing', re: /\b(\d{1,3})\s+(?:existing|current)\s+(?:residential\s+)?(?:dwelling\s+)?(?:units?|apartments?)\b/gi },
    { kind: 'existing', re: /\bexisting\s+(\d{1,3})\s+(?:residential\s+)?(?:dwelling\s+)?(?:units?|apartments?)\b/gi },
    { kind: 'resulting', re: /\b(?:resulting\s+in|for\s+a\s+total\s+of|total\s+of)\s+(\d{1,3})\s+(?:residential\s+)?(?:dwelling\s+)?(?:units?|apartments?)\b/gi },
    { kind: 'project-total', re: /\b(\d{1,3})\s+(?:residential\s+)?(?:units?|apartments?)\s+(?:across|in)\s+\d+\s+buildings\b/gi },
    { kind: 'removal', re: /\b(?:remove|removing|demolish|demolition\s+of)\s+(\d{1,3})\s+(?:residential\s+)?(?:dwelling\s+)?(?:units?|apartments?)\b/gi },
  ];
  for (const {kind,re} of patterns) for (const match of text.matchAll(re)) add(kind, match[1] ? Number(match[1]) : 1, match[0]);
  for (const match of text.matchAll(/\b(?:as|to)\s+(one|two|three|four|five|six|seven|eight|nine|ten)[- ]unit\s+residen(?:ce|tial)\b/gi)) {
    const words=['one','two','three','four','five','six','seven','eight','nine','ten'];
    add('resulting',words.indexOf(match[1].toLowerCase())+1,match[0]);
  }
  for (const match of text.matchAll(/\bconversion\s+of\s+(\d{1,3})\s+unit\s+to\s+(\d{1,3})\s+unit\b/gi)) {
    add('existing',Number(match[1]),match[0]);
    add('resulting',Number(match[2]),match[0]);
  }
  for (const match of text.matchAll(/\b(\d{1,3})\s+new\s+units?\s+in\s+\d+\s+new\s+buildings\b/gi)) add('project-total', Number(match[1]), match[0]);
  const building = findBuildingLabel(text);
  if (building && /\b(?:apartment|residential unit|dwelling unit)s?\b/i.test(text)) {
    for (const match of text.matchAll(/\b(\d{1,3})\s+(?:residential\s+)?(?:apartments?|dwelling\s+units?|units?)\b/gi)) add('building-total', Number(match[1]), match[0]);
  }
  return result;
}

export function candidateBlockers(event: Pick<HousingEvent,'units'|'eventDate'|'evidenceIds'|'reviewDecisionId'>, evidence: Evidence[]): string[] {
  const blockers: string[] = [];
  if (event.units === null) blockers.push('Net additional units have not been established.');
  if (!event.eventDate) blockers.push('An occupancy or housing-event date has not been verified.');
  if (!event.evidenceIds.some(id => evidence.some(e => e.id === id && e.type === 'occupancy' && e.extractionStatus === 'ready'))) blockers.push('Occupancy evidence has not been linked and reviewed.');
  if (!event.reviewDecisionId) blockers.push('A human reviewer has not approved this event.');
  if ('pendingEvidenceId' in event && event.pendingEvidenceId) blockers.push('New event-linked evidence requires review.');
  return blockers;
}

export function canApproveEvent(args: { event: HousingEvent; evidence: Evidence; projectScope: 'real' | 'synthetic'; checks: Record<string, boolean>; units: number; eventDate: string; evidenceQuote:string }): string[] {
  const errors: string[] = [];
  if (args.evidence.type !== 'occupancy') errors.push('Selected evidence is not an occupancy document.');
  if (args.evidence.extractionStatus !== 'ready' || !args.evidence.text.trim()) errors.push('Occupancy text requires extraction or manual transcription.');
  if (args.projectScope === 'real' && args.evidence.synthetic) errors.push('Synthetic evidence cannot support a real ledger event.');
  if (args.projectScope === 'synthetic' && !args.evidence.synthetic) errors.push('Sandbox evidence must remain labeled synthetic.');
  if (!Number.isInteger(args.units) || args.units <= 0) errors.push('A positive net addition must be established.');
  if (args.event.units===null || args.units!==args.event.units) errors.push('Approved units must match the source-supported candidate increment; correct the candidate through a reviewed workflow first.');
  const parsedDate=new Date(`${args.eventDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.eventDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10)!==args.eventDate) errors.push('A valid housing-event date is required.');
  if (!supportedQuote(args.evidence.text,args.evidenceQuote)) errors.push('Occupancy quote must appear verbatim in the selected evidence.');
  const unitPattern=new RegExp(`(^|\\D)${args.units}(\\D|$)`);
  if (!unitPattern.test(args.evidenceQuote)) errors.push('Occupancy quote must support the approved unit count.');
  const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(args.eventDate);
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthName=iso ? monthNames[Number(iso[2])-1] : undefined;
  const dateVariants=iso && monthName ? [
    args.eventDate,
    `${iso[2]}/${iso[3]}/${iso[1]}`,
    `${Number(iso[2])}/${Number(iso[3])}/${iso[1]}`,
    `${monthName} ${Number(iso[3])}, ${iso[1]}`,
    `${monthName.slice(0,3)} ${Number(iso[3])}, ${iso[1]}`,
    `${Number(iso[3])} ${monthName} ${iso[1]}`,
  ] : [];
  if (!dateVariants.some(date=>args.evidenceQuote.toLowerCase().includes(date.toLowerCase()))) errors.push('Occupancy quote must support the selected event date.');
  for (const key of ['identity','residentialScope','units','date','conditions','priorCounting']) if (args.checks[key] !== true) errors.push(`${key} review check is incomplete.`);
  if (args.event.status === 'verified-addition' && args.event.reviewDecisionId) errors.push('This event is already approved.');
  return errors;
}

/** Used by the ledger: parent totals and supporting trades have no event identity. */
export function countApprovedEvents(events: HousingEvent[]): number {
  return [...new Map(events.filter(e => e.status === 'verified-addition' && e.reviewDecisionId && e.units !== null).map(e => [e.id,e])).values()]
    .reduce((sum,e) => sum + (e.units ?? 0),0);
}

export function relationshipIsUnitDuplicate(relationship: Relationship): boolean {
  return relationship.type === 'supporting-trade' || relationship.type === 'parent-project';
}
