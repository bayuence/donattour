'use client';

import type { MenuPanelProps } from './types';
import DonatSection from './sections/DonatSection';
import PaketSection from './sections/PaketSection';
import BundlingSection from './sections/BundlingSection';
import CustomSection from './sections/CustomSection';
import BoxSection from './sections/BoxSection';

/**
 * MenuPanel - Main router component for POS menu sections
 * 
 * This component acts as a clean router that delegates rendering to specialized section components:
 * - DonatSection: Individual donut products with category filtering
 * - PaketSection: Package products with inline selection
 * - BundlingSection: Bundle products
 * - CustomSection: Custom order builder with multi-step flow
 * - BoxSection: Box/packaging products
 */
export default function MenuPanel(props: MenuPanelProps) {
  const { activeSection } = props;

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6 no-scrollbar">
      {activeSection === 'donat' && <DonatSection {...props} />}
      {activeSection === 'paket' && <PaketSection {...props} />}
      {activeSection === 'bundling' && <BundlingSection {...props} />}
      {activeSection === 'custom' && <CustomSection {...props} />}
      {activeSection === 'box' && <BoxSection {...props} />}
    </div>
  );
}
