import { z } from 'zod';

export const StrategicLineEnum = z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
export type StrategicLine = z.infer<typeof StrategicLineEnum>;

export const STRATEGIC_LINES_MAP: Record<StrategicLine, string> = {
  L1: 'Sostenibilità sociale',
  L2: 'Sostenibilità economica',
  L3: 'Sostenibilità ambientale',
  L4: 'Sostenibilità istituzionale',
  L5: 'Sostenibilità nei microcosmi',
  L6: 'Sostenibilità nell\'area vasta',
};

export const LegacyBandoSchema = z.object({
  titolo: z.string(),
  ente: z.string(),
  programma: z.string(),
  categoria: z.string(),
  linee: z.array(z.string()),
  descrizione: z.string(),
  beneficiari: z.string(),
  dotazione: z.string(),
  contributo_max: z.string(),
  cofinanziamento: z.string(),
  scadenza: z.string(),
  scadenza_tipo: z.string(),
  url: z.string(),
  note: z.string().optional().default(''),
});
export type LegacyBando = z.infer<typeof LegacyBandoSchema>;

export const SourceTypeEnum = z.enum([
  'nazionale_pnrr',
  'ue',
  'regione_er',
  'fondazioni',
  'ministeriale',
  'altro',
]);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export const DeadlineTypeEnum = z.enum(['data', 'sportello', 'in_definizione', 'prorogato']);
export type DeadlineType = z.infer<typeof DeadlineTypeEnum>;

export const StateEnum = z.enum(['open', 'closed', 'rolling_verified', 'unknown', 'suspended']);
export type BandoState = z.infer<typeof StateEnum>;

export const EligibilityEnum = z.enum(['confirmed', 'potential', 'excluded', 'unknown']);
export type Eligibility = z.infer<typeof EligibilityEnum>;

export const EvidenceLinkSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

export const ChangeLogItemSchema = z.object({
  date: z.string(),
  note: z.string(),
});
export type ChangeLogItem = z.infer<typeof ChangeLogItemSchema>;

export const ValiditySchema = z.object({
  isOfficiallyVerified: z.boolean(),
  verificationSource: z.string(),
  verifiedUntil: z.string().nullable(),
});
export type Validity = z.infer<typeof ValiditySchema>;

export const CanonicalBandoSchema = z.object({
  id: z.string(),
  original: LegacyBandoSchema,
  sourceCanonicalUrl: z.string().url(),
  sourceDomain: z.string(),
  sourceType: SourceTypeEnum,
  sourceCheckedAt: z.string(),
  sourceEvidence: z.string(),
  discoveredAt: z.string(),
  firstPublishedAt: z.string().nullable(),
  lastChangedAt: z.string(),
  deadline: z.string().nullable(),
  deadlineType: DeadlineTypeEnum,
  state: StateEnum,
  eligibility: EligibilityEnum,
  strategicLines: z.array(StrategicLineEnum),
  thematicTags: z.array(z.string()),
  score0to100: z.number().min(0).max(100),
  scoreReasons: z.array(z.string()),
  publicSummary: z.string(),
  risks: z.array(z.string()),
  evidenceLinks: z.array(EvidenceLinkSchema),
  changeLog: z.array(ChangeLogItemSchema),
  validity: ValiditySchema,
});
export type CanonicalBando = z.infer<typeof CanonicalBandoSchema>;

export const CanonicalDatasetMetaSchema = z.object({
  aggiornato: z.string(),
  totale: z.number(),
  versione_schema: z.string(),
  territorio: z.string(),
  fonte_linee_guida: z.string(),
  statistiche: z.object({
    aperti: z.number(),
    sportello: z.number(),
    chiusi: z.number(),
    in_verifica: z.number(),
    entro_30_giorni: z.number(),
    copertura_linee: z.record(z.string(), z.number()),
    copertura_categorie: z.record(z.string(), z.number()),
  }).optional(),
});
export type CanonicalDatasetMeta = z.infer<typeof CanonicalDatasetMetaSchema>;

export const CanonicalDatasetSchema = z.object({
  meta: CanonicalDatasetMetaSchema,
  bandi: z.array(CanonicalBandoSchema),
});
export type CanonicalDataset = z.infer<typeof CanonicalDatasetSchema>;

export const WeeklyNewsletterEditionSchema = z.object({
  edition_id: z.string(), // RE-FUNDING-YYYY-Www
  generated_at: z.string(),
  week_start: z.string(),
  week_end: z.string(),
  status: z.enum(['READY', 'BLOCKED']),
  quality_passed: z.boolean(),
  item_count: z.number(),
  selected_count: z.number(),
  summary: z.string(),
  html_link: z.string(),
  selected_opportunities: z.array(z.object({
    id: z.string(),
    titolo: z.string(),
    ente: z.string(),
    scadenza: z.string(),
    scadenza_label: z.string(),
    beneficiari: z.string(),
    intensita_aiuto: z.string(),
    fonte_url: z.string(),
    ragione_strategica: z.string(),
    stato_verifica: z.string(),
    score: z.number(),
    linee: z.array(z.string()),
  })),
  quality_report: z.object({
    total_records: z.number(),
    valid_records: z.number(),
    open_or_rolling: z.number(),
    urgent_30d: z.number(),
    unverified_excluded: z.number(),
  }),
});
export type WeeklyNewsletterEdition = z.infer<typeof WeeklyNewsletterEditionSchema>;

export const QualityGateReportSchema = z.object({
  timestamp: z.string(),
  dataset_version: z.string(),
  total_records: z.number(),
  schema_valid: z.boolean(),
  duplicates_found: z.number(),
  invalid_urls: z.number(),
  freshness_hours: z.number(),
  status: z.enum(['PASSED', 'FAILED']),
  checks: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    details: z.string(),
  })),
});
export type QualityGateReport = z.infer<typeof QualityGateReportSchema>;
