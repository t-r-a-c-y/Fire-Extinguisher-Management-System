/** Reporting endpoints + export (PDF/CSV). */
const { ApiError, asyncHandler } = require('@fems/shared');
const reports = require('./reportService');
const { toCsv, toPdf } = require('./exporters');

/** Plain users see only their own data; admins/inspectors see the whole system. */
const scopeOf = (req) => (req.user.role === 'user' ? { userId: req.user.id } : {});

const getInventory = asyncHandler(async (req, res) => res.json(await reports.inventoryReport(scopeOf(req))));
const getInspections = asyncHandler(async (req, res) => res.json(await reports.inspectionReport(scopeOf(req))));
const getCompliance = asyncHandler(async (req, res) =>
  res.json(await reports.complianceReport(scopeOf(req), Number(req.query.upcomingDays) || 30)));
const getMaintenance = asyncHandler(async (req, res) => res.json(await reports.maintenanceReport(scopeOf(req))));
const getSummary = asyncHandler(async (req, res) => res.json(await reports.dashboardSummary(scopeOf(req))));

/**
 * Flatten each report into (csvRows, pdfSections) for export.
 */
async function buildExport(type, scope) {
  switch (type) {
    case 'inventory': {
      const r = await reports.inventoryReport(scope);
      const csvRows = [
        ...r.byStatus.map((x) => ({ dimension: 'status', key: x.status, count: x.count })),
        ...r.byType.map((x) => ({ dimension: 'type', key: x.type, count: x.count })),
        ...r.bySize.map((x) => ({ dimension: 'size', key: x.size, count: x.count })),
      ];
      return {
        title: 'Inventory Report',
        subtitle: `Total extinguishers: ${r.total}`,
        csvRows,
        sections: [
          { heading: 'By Status', rows: r.byStatus },
          { heading: 'By Type', rows: r.byType },
          { heading: 'By Size', rows: r.bySize },
          { heading: 'Monthly Summary', rows: r.summaries.monthly },
        ],
      };
    }
    case 'inspections': {
      const r = await reports.inspectionReport(scope);
      return {
        title: 'Inspection Report',
        subtitle: `Pending: ${r.counts.pending}  Completed: ${r.counts.completed}  Overdue: ${r.counts.overdue}`,
        csvRows: r.inspections,
        sections: [{ heading: 'Inspections', rows: r.inspections }],
      };
    }
    case 'compliance': {
      const r = await reports.complianceReport(scope);
      return {
        title: 'Compliance Report',
        subtitle: `Compliance: ${r.compliancePercentage}%  Expired: ${r.expiredCount}  Upcoming: ${r.upcomingCount}`,
        csvRows: [...r.expired.map((e) => ({ ...e, bucket: 'expired' })),
                  ...r.upcomingExpirations.map((e) => ({ ...e, bucket: 'upcoming' }))],
        sections: [
          { heading: 'Expired Extinguishers', rows: r.expired },
          { heading: 'Upcoming Expirations', rows: r.upcomingExpirations },
        ],
      };
    }
    case 'maintenance': {
      const r = await reports.maintenanceReport(scope);
      return {
        title: 'Maintenance Report',
        subtitle: `Total records: ${r.totalRecords}`,
        csvRows: r.history,
        sections: [
          { heading: 'Maintenance Frequency', rows: r.frequency },
          { heading: 'Maintenance History', rows: r.history },
        ],
      };
    }
    default:
      throw ApiError.badRequest(`Unknown report type: ${type}`);
  }
}

// GET /reports/:type/export?format=pdf|csv
const exportReport = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const format = (req.query.format || 'pdf').toLowerCase();
  const data = await buildExport(type, scopeOf(req));
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${stamp}.csv"`);
    return res.send(toCsv(data.csvRows));
  }
  if (format === 'pdf') {
    const buffer = await toPdf({ title: data.title, subtitle: data.subtitle, sections: data.sections });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${stamp}.pdf"`);
    return res.send(buffer);
  }
  throw ApiError.badRequest("format must be 'pdf' or 'csv'");
});

module.exports = {
  getInventory, getInspections, getCompliance, getMaintenance, getSummary, exportReport,
};
