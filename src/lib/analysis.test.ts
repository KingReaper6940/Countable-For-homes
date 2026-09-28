import { beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const { createResponse } = vi.hoisted(() => ({ createResponse: vi.fn() }));
vi.mock('openai', () => ({ default: class { responses = { create: createResponse }; } }));

async function app() {
  vi.resetModules();
  process.env.COUNTABLE_DB_PATH = join(tmpdir(), `countable-analysis-${randomUUID()}.db`);
  const db = await import('./db');
  const analysis = await import('./analysis');
  return { ...db, ...analysis };
}

beforeEach(() => {
  createResponse.mockReset();
  delete process.env.OPENAI_API_KEY;
});

describe('live analysis provenance', () => {
  it('returns labeled, quote-checked saved analysis without a key', async () => {
    const service = await app();
    const result = await service.analyzeProject('development-10c');
    expect(result.mode).toBe('saved-ai-replay');
    if (result.mode !== 'saved-ai-replay') throw new Error('Expected saved analysis');
    expect(result.analysis.model).toBe('GPT-6 Sol');
    expect(result.fallbackReason).toMatch(/No OpenAI API key/);
    expect(createResponse).not.toHaveBeenCalled();
  });

  it('returns genuine live findings from the current source and leaves reviewed proposals intact', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const service = await app();
    const project = service.getProject('development-10c')!;
    const approved = project.relationships.find(item => item.type === 'supporting-trade')!;
    const approvedClaim = project.claims.find(item => item.kind === 'project-total')!;
    const decisions = await import('./decisions');
    decisions.applyDecision({ projectId: project.project.id, action: 'approve_relationship', targetId: approved.id, reason: 'Explicit cited permit reference.' });
    decisions.applyDecision({ projectId: project.project.id, action: 'approve_claim', targetId: approvedClaim.id, reason: 'The quoted parent total is explicit.' });
    const source = project.records.find(item => item.permitId === 'BDA-2024-03554')!;
    const quote = '70 NEW UNITS IN 8 NEW BUILDINGS';
    expect(source.description).toContain(quote);
    createResponse.mockResolvedValue({ status: 'completed', output_text: JSON.stringify({
      summary: 'The application describes a phase-wide plan; occupancy still needs evidence.',
      findings: [
        { permitId: source.permitId, quote, interpretation: 'This is a parent project total.', reviewQuestion: 'Which buildings have occupancy evidence?' },
        { permitId: source.permitId, quote: '100 NEW UNITS', interpretation: 'Incorrect.', reviewQuestion: 'Verify?' },
      ],
      claims: [{ permitId: project.records.find(item => item.id === approvedClaim.recordId)!.permitId, kind: approvedClaim.kind, units: approvedClaim.units, quote: approvedClaim.quote }],
      relationships: [{ fromPermitId: project.records.find(item => item.id === approved.fromRecordId)!.permitId, toPermitId: project.records.find(item => item.id === approved.toRecordId)!.permitId, type: approved.type, reason: 'Explicit reference', quote: approved.sourceQuote }],
      warnings: [],
    }) });
    const result = await service.analyzeProject(project.project.id);
    expect(result.mode).toBe('live');
    expect(result.analysis.findings).toEqual([expect.objectContaining({ permitId: source.permitId, quote })]);
    expect(result.analysis.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/1 unsupported quote/)]));
    expect(result.analysis.model).toBe('GPT-6 Sol');
    expect(createResponse).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-6-sol', reasoning: { effort: 'low' } }));
    expect(service.getProject(project.project.id)!.relationships.find(item => item.id === approved.id)?.status).toBe('approved');
    expect(service.getProject(project.project.id)!.claims.find(item => item.id === approvedClaim.id)?.reviewStatus).toBe('approved');
    expect(result.analysis.proposedClaims).toBe(0);
    expect(result.analysis.proposedRelationships).toBe(0);
    expect(result.analysis.summary).not.toMatch(/Saved/);
  });

  it('does not show fabricated live quotes and falls back when none can be verified', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const service = await app();
    createResponse.mockResolvedValue({ status: 'completed', output_text: JSON.stringify({
      summary: 'Unsupported claim.',
      findings: [{ permitId: 'BDA-2024-03554', quote: '100 NEW UNITS', interpretation: 'Incorrect.', reviewQuestion: 'Verify?' }],
      claims: [], relationships: [], warnings: [],
    }) });
    const result = await service.analyzeProject('development-10c');
    expect(result.mode).toBe('saved-ai-replay');
    if (result.mode !== 'saved-ai-replay') throw new Error('Expected saved analysis');
    expect(result.fallbackReason).toMatch(/could not be verified/);
    expect(service.getProject('development-10c')!.audit.filter(item => item.action === 'analyze')).toHaveLength(0);
  });

  it('falls back cleanly when the live API fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const service = await app();
    createResponse.mockRejectedValue(new Error('sensitive provider detail'));
    const result = await service.analyzeProject('development-10c');
    expect(result.mode).toBe('saved-ai-replay');
    expect(JSON.stringify(result)).not.toContain('sensitive provider detail');
  });

  it('uses rules only for projects without saved analysis and names the live failure neutrally', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const service = await app();
    createResponse.mockRejectedValue(Object.assign(new Error('hidden provider text'), { status: 429, code: 'insufficient_quota' }));
    const result = await service.analyzeProject('conversion-12k');
    expect(result.mode).toBe('rules-only');
    if (result.mode !== 'rules-only') throw new Error('Expected rules-only fallback');
    expect(result.fallbackReason).toBe('The OpenAI account has insufficient quota.');
    expect(result.analysis.findings).toEqual([]);
  });
});
