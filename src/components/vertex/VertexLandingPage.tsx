// Master Vertex-inspired Landing Page for Rail Samnvay
import React from 'react';
import { VertexNavbar } from './VertexNavbar';
import { VertexHero } from './VertexHero';
import { RailwayNetworkSection } from './RailwayNetworkSection';
import { BlockRequestSection } from './BlockRequestSection';
import { PlanningSection } from './PlanningSection';
import { ConflictSection } from './ConflictSection';
import { ExecutionSection } from './ExecutionSection';
import { 
  OperationsStrip, 
  IntroductionSection, 
  DepartmentSection, 
  WorkflowSection, 
  AuditSection, 
  VertexFooter 
} from './EditorialSections';

interface VertexLandingPageProps {
  onEnterControlRoom: () => void;
}

export const VertexLandingPage: React.FC<VertexLandingPageProps> = ({
  onEnterControlRoom,
}) => {
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const topOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-railway-canvas text-railway-textPrimary selection:bg-railway-forest selection:text-white font-sans">
      {/* 1. Recreated Vertex Navbar */}
      <VertexNavbar onEnterControlRoom={onEnterControlRoom} />

      {/* Main Page Layout with Generous Spacing */}
      <main className="space-y-4 sm:space-y-6">
        
        {/* 2. Signature Large Rounded Container Hero */}
        <VertexHero 
          onCreateBlockClick={() => scrollToSection('requests')}
          onExploreNetworkClick={() => scrollToSection('network')}
        />

        {/* 3. Scrolling Railway Operations Strip */}
        <OperationsStrip />

        {/* 4. Large Editorial Introduction Section */}
        <IntroductionSection />

        {/* 5. Department Section (Permanent Way, S&T, Traction/OHE) */}
        <DepartmentSection />

        {/* 6. Interactive Railway Network Section with Circular Controls */}
        <RailwayNetworkSection />

        {/* 7. Block Request Section (Put the next block in motion) */}
        <BlockRequestSection />

        {/* 8. Horizontal Workflow Progression (Request -> Review -> Approval -> Planning -> Execution) */}
        <WorkflowSection />

        {/* 9. Planning Timeline Section (Make every maintenance window count) */}
        <PlanningSection />

        {/* 10. Operational Conflict Section (TRD OHE Maintenance alternative) */}
        <ConflictSection />

        {/* 11. 6-Stage Execution Tracker */}
        <ExecutionSection />

        {/* 12. Clean Activity Audit Log */}
        <AuditSection />

      </main>

      {/* 13. Institutional Clean Footer */}
      <VertexFooter />
    </div>
  );
};
