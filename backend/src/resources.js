// Single source of truth for every REST resource:
//   API name (camelCase, used by the frontend)  ->  MySQL table, id prefix, RBAC module and columns.
// Column types: s=VARCHAR(255) t=TEXT d=DATE dt=DATETIME n=DECIMAL(12,2) i=INT b=BOOLEAN j=JSON(LONGTEXT)
// Field names are camelCase in the API and snake_case in MySQL (converted automatically).
// Any field the frontend sends that is not listed here is kept in the `extra` JSON column, so nothing is lost.

const crewScoped = true

export const RESOURCES = {
  crew: {
    table: 'crew', prefix: 'CRW', module: 'crew',
    hidden: ['passwordHash'],
    rename: { createdAt: 'registered_on' },
    columns: {
      employeeId: 's', firstName: 's', lastName: 's', dob: 'd', gender: 's', nationality: 's', phone: 's', email: 's', address: 't',
      passportNo: 's', passportExpiry: 'd', cdcNo: 's', cdcExpiry: 'd', indosNo: 's',
      emergencyName: 's', emergencyRelation: 's', emergencyPhone: 's',
      department: 's', rank: 's', totalExperienceMonths: 'i', rankExperienceMonths: 'i', previousEmployer: 's', vesselTypeExperience: 's',
      lastSignOn: 'd', lastSignOff: 'd', availableFrom: 'd', expectedSalary: 'n', preferredVesselType: 's', preferredTradingArea: 's',
      status: 's', photo: 't', cvFile: 's', createdAt: 'd', passwordHash: 's',
    },
    indexes: ['email', 'passportNo', 'status', 'rank'],
  },
  seaService: { table: 'sea_service', prefix: 'SS', module: 'crew', crewScoped, columns: { crewId: 's', vesselName: 's', vesselType: 's', rank: 's', company: 's', signOn: 'd', signOff: 'd', grt: 'i' } },
  comments: { table: 'crew_comments', prefix: 'CMT', module: 'crew', staffOnly: true, columns: { crewId: 's', author: 's', date: 'dt', text: 't' } },
  clients: { table: 'clients', prefix: 'CLI', module: 'vessels', columns: { name: 's', country: 's', contact: 's', email: 's' } },
  vessels: {
    table: 'vessels', prefix: 'VSL', module: 'vessels',
    columns: { name: 's', imo: 's', type: 's', flag: 's', owner: 's', manager: 's', clientId: 's', grt: 'i', dwt: 'i', built: 's', tradingArea: 's', status: 's', manning: 'j', documents: 'j' },
    indexes: ['imo'],
  },
  documents: {
    table: 'crew_documents', prefix: 'DOC', module: 'documents', crewScoped,
    columns: { crewId: 's', type: 's', number: 's', issueDate: 'd', expiryDate: 'd', issuingAuthority: 's', status: 's', remarks: 't', version: 'i', fileName: 's', fileUrl: 't' },
    indexes: ['expiryDate'],
  },
  vacancies: {
    table: 'vacancies', prefix: 'VAC', module: 'recruitment',
    columns: { title: 's', clientId: 's', vesselId: 's', rank: 's', department: 's', numberRequired: 'i', minExperienceMonths: 'i', mandatoryCertificates: 't', salary: 'n', currency: 's', contractMonths: 'i', joiningDate: 'd', joiningPort: 's', deadline: 'd', status: 's', description: 't', postedOn: 'd' },
  },
  applications: {
    table: 'applications', prefix: 'APP', module: 'recruitment', crewScoped,
    columns: { vacancyId: 's', crewId: 's', appliedOn: 'd', stage: 's', source: 's', screeningResult: 's', interviewDate: 'dt', interviewer: 's', assessmentScore: 'i', internalApproval: 's', clientApproval: 's', offerSent: 'b', status: 's', remarks: 't' },
    indexes: ['vacancyId'],
  },
  assignments: {
    table: 'assignments', prefix: 'ASG', module: 'planning', crewScoped,
    columns: { crewId: 's', vesselId: 's', rank: 's', signOnDate: 'd', plannedSignOff: 'd', actualSignOff: 'd', joiningPort: 's', relievingId: 's', status: 's', approval: 's', remarks: 't', fromApplication: 's' },
    indexes: ['vesselId', 'status'],
  },
  contracts: {
    table: 'contracts', prefix: 'CON', module: 'contracts', crewScoped,
    columns: { crewId: 's', vesselId: 's', rank: 's', startDate: 'd', endDate: 'd', durationMonths: 'i', basicWage: 'n', fixedOT: 'n', leavePay: 'n', otherAllowance: 'n', currency: 's', cba: 's', terms: 't', status: 's', approval: 's', signed: 'b', signedAt: 'dt', version: 'i', history: 'j', renewedFrom: 's' },
  },
  medicals: { table: 'medicals', prefix: 'MED', module: 'medical', crewScoped, columns: { crewId: 's', examDate: 'd', expiryDate: 'd', centre: 's', doctor: 's', status: 's', restrictions: 't', remarks: 't', fileName: 's', fileUrl: 't' } },
  travel: {
    table: 'travel', prefix: 'TRV', module: 'travel', crewScoped,
    columns: { crewId: 's', vesselId: 's', purpose: 's', fromCity: 's', toCity: 's', departure: 'dt', arrival: 'dt', airline: 's', flightNo: 's', pnr: 's', visaStatus: 's', hotel: 's', pickup: 's', agent: 's', expenses: 'n', currency: 's', status: 's', joiningConfirmed: 'b', instructions: 't', ticketFile: 's' },
  },
  signOns: { table: 'sign_ons', prefix: 'SON', module: 'signonoff', columns: { crewId: 's', vesselId: 's', rank: 's', joiningDate: 'd', port: 's', joiningConfirmed: 'b', masterConfirmed: 'b', contractCommenced: 'b', documentsReceived: 'b', fileName: 's' } },
  signOffs: { table: 'sign_offs', prefix: 'SOF', module: 'signonoff', columns: { crewId: 's', vesselId: 's', rank: 's', signOffDate: 'd', port: 's', reason: 's', masterAppraisal: 's', settlementStatus: 's', nextEligibility: 's', remarks: 't', settledOn: 'd' } },
  appraisals: {
    table: 'appraisals', prefix: 'APR', module: 'appraisals',
    columns: { crewId: 's', vesselId: 's', rank: 's', periodFrom: 'd', periodTo: 'd', evaluator: 's', technical: 'i', safety: 'i', behaviour: 'i', teamwork: 'i', overall: 'n', rehire: 's', trainingRecommendation: 't', comments: 't' },
  },
  payroll: {
    table: 'payroll', prefix: 'PAY', module: 'payroll', crewScoped,
    columns: { crewId: 's', vesselId: 's', period: 's', basic: 'n', fixedOT: 'n', extraOT: 'n', leaveWages: 'n', allowances: 'n', advance: 'n', deductions: 'n', gross: 'n', net: 'n', allotment: 'n', currency: 's', status: 's', bank: 's', paidOn: 'd' },
    indexes: ['period'],
  },
  salaryStructures: { table: 'salary_structures', prefix: 'SAL', module: 'payroll', columns: { rank: 's', basic: 'n', fixedOT: 'n', leavePay: 'n', otherAllowance: 'n', otRate: 'n', currency: 's' } },
  courses: { table: 'courses', prefix: 'CRS', module: 'training', columns: { code: 's', name: 's', mandatoryFor: 's', validityMonths: 'i', durationDays: 'i', institute: 's' } },
  trainingRecords: { table: 'training_records', prefix: 'TRN', module: 'training', crewScoped, columns: { crewId: 's', courseId: 's', institute: 's', completedOn: 'd', expiryDate: 'd', certificateNo: 's', status: 's', fileName: 's', fileUrl: 't' } },
  notifications: { table: 'notifications', prefix: 'NTF', module: 'notifications', columns: { type: 's', title: 's', body: 't', channel: 's', audience: 's', crewId: 's', date: 'd', read: 'b', status: 's' } },
  requests: { table: 'crew_requests', prefix: 'REQ', module: 'notifications', crewScoped, columns: { crewId: 's', subject: 's', message: 't', date: 'd', status: 's', response: 't' } },
  users: {
    table: 'users', prefix: 'USR', module: 'users',
    hidden: ['passwordHash', 'mfaSecret'],
    columns: { name: 's', email: 's', role: 's', status: 's', mfa: 'b', scope: 's', lastLogin: 'd', passwordHash: 's', mfaSecret: 's' },
    unique: ['email'],
  },
  audit: { table: 'audit_log', prefix: 'AUD', module: 'audit', readOnly: true, columns: { at: 'dt', user: 's', action: 's', resource: 's', recordId: 's', detail: 't' }, indexes: ['at'] },
}

export const SQL_TYPES = { s: 'VARCHAR(255)', t: 'TEXT', d: 'DATE', dt: 'DATETIME', n: 'DECIMAL(12,2)', i: 'INT', b: 'TINYINT(1)', j: 'LONGTEXT' }

export const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase()

// MySQL column name for an API field (camelCase -> snake_case, with per-resource overrides)
export const colName = (resource, key) => RESOURCES[resource]?.rename?.[key] || snake(key)

export function createTableSQL(name) {
  const r = RESOURCES[name]
  const cols = [
    '  `id` VARCHAR(32) NOT NULL',
    ...Object.entries(r.columns).map(([k, t]) => `  \`${colName(name, k)}\` ${SQL_TYPES[t]} NULL`),
    '  `extra` LONGTEXT NULL',
    '  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP',
    '  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    '  PRIMARY KEY (`id`)',
  ]
  if (r.columns.crewId) cols.push(`  KEY \`idx_${r.table}_crew_id\` (\`crew_id\`)`)
  ;(r.indexes || []).forEach((k) => cols.push(`  KEY \`idx_${r.table}_${snake(k)}\` (\`${snake(k)}\`)`))
  ;(r.unique || []).forEach((k) => cols.push(`  UNIQUE KEY \`uq_${r.table}_${snake(k)}\` (\`${snake(k)}\`)`))
  return `CREATE TABLE IF NOT EXISTS \`${r.table}\` (\n${cols.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
}

export const CONFIG_TABLE_SQL = 'CREATE TABLE IF NOT EXISTS `app_config` (\n  `config_key` VARCHAR(64) NOT NULL,\n  `value` LONGTEXT NOT NULL,\n  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`config_key`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
