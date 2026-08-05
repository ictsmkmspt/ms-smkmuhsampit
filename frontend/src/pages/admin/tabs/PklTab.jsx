import DudiTab from './pkl/DudiTab';
import PenempatanTab from './pkl/PenempatanTab';

export const PKL_SUBMENU = [
  { key: 'dudi',        label: 'Kelola IDUKA',     component: DudiTab, restrictTo: ['waka_humas', 'waka_kurikulum'] },
  { key: 'penempatan',  label: 'Penempatan PKL',  component: PenempatanTab, restrictTo: ['waka_humas', 'waka_kurikulum'] },
];

export default function PklTab({ activeSub }) {
  const current = PKL_SUBMENU.find((s) => s.key === activeSub) || PKL_SUBMENU[0];
  const ActiveComponent = current.component;
  return <ActiveComponent />;
}
