'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatusBadge, Spinner, Modal, Field, Alert } from '@/components/ui';

export default function ExtinguisherDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [ext, setExt] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [error, setError] = useState('');
  const [reqModal, setReqModal] = useState(false);
  const [req, setReq] = useState({ kind: 'update_details', message: '' });
  const [reqMsg, setReqMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/extinguishers/${id}`).then((r) => setExt(r.extinguisher)).catch((e) => setError(e.message));
    api.get(`/inspections?extinguisherId=${id}`).then((r) => setInspections(r.inspections)).catch(() => {});
    api.get(`/maintenance?extinguisherId=${id}`).then((r) => setMaintenance(r.maintenance)).catch(() => {});
  }, [id]);

  async function sendRequest(e) {
    e.preventDefault(); setBusy(true); setReqMsg('');
    try {
      const r = await api.post(`/extinguishers/${id}/request`, req);
      setReqMsg(r.message || 'Request sent.');
      setTimeout(() => setReqModal(false), 1200);
    } catch (err) { setReqMsg(err.message); } finally { setBusy(false); }
  }

  if (error) return <div className="text-red-600">{error}</div>;
  if (!ext) return <Spinner />;

  const detail = [
    ['Serial number', ext.serialNumber], ['Location', ext.location],
    ['Type', ext.type.replace('_', ' ')], ['Size', ext.size],
    ['Installation date', ext.installationDate?.slice(0, 10)], ['Expiry date', ext.expiryDate?.slice(0, 10)],
    ['Last inspected', ext.lastInspectedAt ? ext.lastInspectedAt.slice(0, 10) : '—'],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/extinguishers" className="text-sm text-brand-600 hover:underline">← Back to extinguishers</Link>
          <h1 className="mt-1 text-2xl font-bold">{ext.serialNumber}</h1>
          <p className="text-sm text-muted">{ext.location}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={ext.status} />
          <button className="btn-secondary" onClick={() => { setReqMsg(''); setReqModal(true); }}>Send a request</button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {detail.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-slate-100 pb-2 text-sm dark:border-slate-800">
              <dt className="text-muted">{k}</dt><dd className="font-medium capitalize">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Inspection history</h2>
        {inspections.length === 0 ? <p className="text-sm text-muted">No inspections recorded.</p> : (
          <div className="space-y-2">
            {inspections.map((i) => (
              <div key={i.id} className="rounded-md surface-muted p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{i.scheduledDate?.slice(0, 10)} {i.scheduledTime?.slice(0, 5) || ''}</span>
                  <span className="flex gap-2"><StatusBadge value={i.status} />{i.result && <StatusBadge value={i.result} />}</span>
                </div>
                {/* What the inspector recorded — visible to the user (#9) */}
                {i.notes && <p className="mt-1 text-muted"><span className="font-medium">Inspector notes:</span> {i.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Maintenance history</h2>
        {maintenance.length === 0 ? <p className="text-sm text-muted">No maintenance recorded.</p> : (
          <div className="space-y-2">
            {maintenance.map((m) => (
              <div key={m.id} className="rounded-md surface-muted p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.actionTaken}</span>
                  <span className="text-muted">{m.maintenanceDate?.slice(0, 10)}</span>
                </div>
                {m.issuesIdentified && <p className="mt-1 text-muted">Issues: {m.issuesIdentified}</p>}
                {m.recommendations && <p className="text-muted">Recommendations: {m.recommendations}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Send a request to the team"
        footer={<>
          <button className="btn-secondary" onClick={() => setReqModal(false)}>Cancel</button>
          <button className="btn-primary" form="req-form" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </>}>
        <form id="req-form" onSubmit={sendRequest} className="space-y-3">
          <Alert kind="success">{reqMsg}</Alert>
          <Field label="Request type">
            <select className="input" value={req.kind} onChange={(e) => setReq({ ...req, kind: e.target.value })}>
              <option value="update_details">Ask admin/inspector to update details or location</option>
              <option value="inspection">Request an inspection</option>
              <option value="purchase">Request purchase of a similar unit</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Message (optional)">
            <textarea className="input" rows={3} value={req.message} onChange={(e) => setReq({ ...req, message: e.target.value })} placeholder="Add any details…" />
          </Field>
          <p className="text-xs text-muted">Your request is sent as a notification to admins and inspectors.</p>
        </form>
      </Modal>
    </div>
  );
}
