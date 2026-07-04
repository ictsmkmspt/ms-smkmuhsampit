import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';

export default function StudentViolationModal({ student, onClose }) {
  const [violationTypes, setViolationTypes] = useState([]);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [typeId, setTypeId]         = useState('');
  const [violations, setViolations] = useState([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    api.get('/violation-types').then((res) => setViolationTypes(res.data));
  }, []);

  const loadViolations = () => {
    setLoading(true);
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (typeId) params.violation_type_id = typeId;

    api.get(`/students/${student.id}/violations`, { params })
      .then((res) => setViolations(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadViolations(); }, [student.id]); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-line-200">
          <div>
            <h3 className="font-display font-semibold text-ink-900">{student.user?.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{student.class_room?.name || '-'} · Riwayat Pelanggaran</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-wrap gap-3 items-end border-b border-line-200">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="field-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="field-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Jenis Pelanggaran</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="field-input text-sm">
              <option value="">Semua Jenis</option>
              {violationTypes.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <button onClick={loadViolations} className="btn-primary text-sm">Terapkan Filter</button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : violations.length === 0 ? (
            <p className="text-center text-ink-300 py-6">Tidak ada riwayat pelanggaran untuk filter ini.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium">Tanggal</th>
                  <th className="font-medium">Jenis Pelanggaran</th>
                  <th className="font-medium text-right">Poin</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v) => (
                  <tr key={v.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-700 align-top">{v.date}</td>
                    <td className="text-ink-900 align-top">
                      {v.violation_type?.name || (v.type === 'alpa' ? 'Tidak Hadir' : v.type === 'telat' ? 'Terlambat' : '-')}
                      {v.note && <p className="text-xs text-ink-400 mt-0.5">{v.note}</p>}
                    </td>
                    <td className="text-right text-honey-700 font-medium align-top">+{v.poin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
