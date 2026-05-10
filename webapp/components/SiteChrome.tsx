import Link from "next/link";
import type { ReactNode } from "react";

export function CollageBackground() {
  return (
    <div className="lpBackground" aria-hidden="true">
      <img alt="" className="lpBackgroundImage" src="/landing/bg-all-sections-2400.png" />
      <div className="lpBackgroundOverlay" />
    </div>
  );
}

interface SiteNavProps {
  rightSlot?: ReactNode;
}

export function SiteNav({ rightSlot }: SiteNavProps) {
  return (
    <div className="lpNav">
      <div className="lpNavBrand">
        <img className="lpNavLogo" alt="Anyware" src="/landing/anyware-logo.png" />
        <Link href="/">anyware</Link>
      </div>
      <div className="lpNavLinks">
        <Link href="/demo">try</Link>
        <Link href="/learn">learn</Link>
      </div>
      {rightSlot ? <div className="lpNavUtility">{rightSlot}</div> : null}
    </div>
  );
}
