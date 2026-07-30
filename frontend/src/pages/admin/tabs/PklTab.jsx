import DudiTab from './pkl/DudiTab';
import PenempatanTab from './pkl/PenempatanTab';

export const PKL_SUBMENU = [
  { key: 'dudi',        label: 'Kelola DUDI',     component: DudiTab },
  { key: 'penempatan',  label: 'Penempatan PKL',  component: PenempatanTab },
];

export default function PklTab({ activeSub }) {
  const current = PKL_SUBMENU.find((s) => s.key === activeSub) || PKL_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
