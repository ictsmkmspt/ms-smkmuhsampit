import RoomsTab from '../sarpras/RoomsTab';
import AssetsTab from '../sarpras/AssetsTab';
import MaintenanceTab from '../sarpras/MaintenanceTab';

export const SARPRAS_SUBMENU = [
  { key: 'ruang', label: 'Ruang & Lab',     component: RoomsTab },
  { key: 'aset',  label: 'Inventaris Aset', component: AssetsTab },
  { key: 'pemeliharaan', label: 'Pemeliharaan', component: MaintenanceTab },
];

export default function SarprasTab({ activeSub }) {
  const current = SARPRAS_SUBMENU.find((s) => s.key === activeSub) || SARPRAS_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
