import FormulirPpdbTab from '../ppdb/FormulirPpdbTab';
import KeuanganPpdbTab from '../ppdb/KeuanganPpdbTab';
import PengaturanPpdbTab from '../ppdb/PengaturanPpdbTab';

export const PPDB_SUBMENU = [
  { key: 'formulir',    label: 'Formulir PPDB',    component: FormulirPpdbTab },
  { key: 'keuangan',    label: 'Keuangan PPDB',    component: KeuanganPpdbTab },
  { key: 'pengaturan',  label: 'Pengaturan PPDB',  component: PengaturanPpdbTab },
];

export default function PpdbTab({ activeSub }) {
  const current = PPDB_SUBMENU.find((s) => s.key === activeSub) || PPDB_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
