import RoomsTab from '../sarpras/RoomsTab';
import AssetsTab from '../sarpras/AssetsTab';

export const SARPRAS_SUBMENU = [
  { key: 'ruang', label: 'Ruang & Lab',     component: RoomsTab },
  { key: 'aset',  label: 'Inventaris Aset', component: AssetsTab },
];

export default function SarprasTab({ activeSub }) {
  const current = SARPRAS_SUBMENU.find((s) => s.key === activeSub) || SARPRAS_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
