const cron       = require('node-cron');
const SecurityLog = require('../models/SecurityLog');

/**
 * Generates a weekly audit summary and logs it to the console.
 * Runs every Monday at 08:00 server time.
 * Extend to send email via nodemailer if needed.
 */
async function runAuditReport() {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  try {
    const summary = await SecurityLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id:      { action: '$action', severity: '$severity' },
          count:    { $sum: 1 },
        },
      },
      { $sort: { '_id.severity': 1, count: -1 } },
    ]);

    const criticals = summary.filter(s => s._id.severity === 'critical');

    console.log('\n===== Weekly Audit Report =====');
    console.log(`Period: ${since.toISOString()} → ${new Date().toISOString()}`);
    console.log('Action breakdown:');
    summary.forEach(({ _id, count }) => {
      console.log(`  [${_id.severity.toUpperCase()}] ${_id.action}: ${count}`);
    });

    if (criticals.length) {
      console.warn('\n⚠  CRITICAL events detected this week:');
      criticals.forEach(({ _id, count }) => {
        console.warn(`  ${_id.action}: ${count} occurrences`);
      });
    }
    console.log('================================\n');
  } catch (err) {
    console.error('[auditReport] Failed to generate weekly report:', err.message);
  }
}

function startAuditReportJob() {
  // Every Monday at 08:00 server time
  cron.schedule('0 8 * * 1', () => {
    console.log('[auditReport] Running weekly audit report...');
    runAuditReport();
  });
  console.log('[auditReport] Weekly audit job scheduled (Mon 08:00)');
}

module.exports = { startAuditReportJob };