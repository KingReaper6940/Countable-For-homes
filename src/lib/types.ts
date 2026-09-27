export type Scope = 'real' | 'synthetic';
export type ReviewStatus = 'unresolved' | 'evidence-awaiting-review' | 'documented-permitted-change' | 'verified-addition';
export type RelationshipType = 'parent-project' | 'building' | 'supporting-trade' | 'amendment' | 'occupancy-related';
export type RelationshipStatus = 'proposed' | 'approved' | 'rejected';
export type ClaimKind = 'existing' | 'resulting' | 'addition' | 'removal' | 'project-total' | 'building-total';

export interface ProjectSummary {
  id: string; scope: Scope; name: string; subtitle: string; parcel: string; address: string;
  recordCount: number; claimSummary: string; reviewStatus: ReviewStatus; unresolved: string[];
  verifiedUnits: number | null;
}
export interface SourceRecord {
  id: string; permitId: string; type: string; description: string; workType: string;
  issueDate: string | null; parcel: string; address: string; status: string;
  buildingLabel: string | null; sourceUrl: string;
}
export interface Claim {
  id: string; recordId: string; kind: ClaimKind; units: number; quote: string;
  reviewStatus: 'proposed' | 'approved' | 'rejected';
}
export interface Relationship {
  id: string; fromRecordId: string; toRecordId: string; type: RelationshipType;
  status: RelationshipStatus; reason: string; sourceQuote: string | null;
}
export interface Evidence {
  id: string; type: 'permit' | 'occupancy' | 'other'; label: string; text: string;
  sourceRef: string; pageRef: string | null; synthetic: boolean;
  extractionStatus: 'ready' | 'manual-needed'; createdAt: string;
  originalFileUrl: string | null; sha256: string | null;
}
export interface HousingEvent {
  id: string; kind: 'addition'; buildingLabel: string | null; units: number | null;
  eventDate: string | null; status: ReviewStatus; blockers: string[];
  sourceRecordIds: string[]; evidenceIds: string[]; reviewDecisionId: string | null;
  pendingEvidenceId: string | null;
}
export interface AuditEvent {
  id: string; action: string; targetType: string; targetId: string; reason: string;
  at: string; details: Record<string, unknown>;
}
export interface Coverage {
  snapshotAt: string | null; sourceUrl: string; recordCount: number; caseCount: number; note: string;
}
export interface ProjectDetail {
  project: ProjectSummary; records: SourceRecord[]; claims: Claim[];
  relationships: Relationship[]; evidence: Evidence[]; events: HousingEvent[];
  audit: AuditEvent[]; mode: 'live' | 'rules-only';
}
