import Link from "next/link";
import type { ReactNode } from "react";

const logoAsset = "https://www.figma.com/api/mcp/asset/d0f3a9ec-66ea-4c4d-8e1f-8323497e0f20";
const collageAssets = [
  "https://www.figma.com/api/mcp/asset/4516637d-9ee8-47d5-9092-b9aced8df556",
  "https://www.figma.com/api/mcp/asset/92220bdd-7e7e-4e40-b0a8-7eb57d7ff3f6",
  "https://www.figma.com/api/mcp/asset/0196b817-59a7-4cfa-a60a-113a3fbf15bd",
  "https://www.figma.com/api/mcp/asset/41e0e86e-e155-4b8b-8dcf-37f60d3cbad6",
  "https://www.figma.com/api/mcp/asset/ccb40e7c-a5dd-4bcd-8986-a35cf2c0d9f8",
  "https://www.figma.com/api/mcp/asset/c393dc68-1676-4473-a782-831c522403e6",
  "https://www.figma.com/api/mcp/asset/9578e601-c65e-4922-bd50-c863916626ea",
  "https://www.figma.com/api/mcp/asset/9ea7b5bf-e16a-43e9-a332-77ae6ce6bba1",
  "https://www.figma.com/api/mcp/asset/d2a844ac-3fa8-4a0e-bc51-05f4c9e75354",
  "https://www.figma.com/api/mcp/asset/135b82e9-b5cc-4457-9b62-ab52be37e277",
];

export function CollageBackground() {
  return (
    <div className="lpBackground" aria-hidden="true">
      {collageAssets.map((asset, index) => (
        <img
          alt=""
          className="lpBackgroundImage"
          key={asset}
          src={asset}
          style={{
            opacity: 0.16 + (index % 3) * 0.06,
            transform: `rotate(-90deg) scale(${1.18 + (index % 4) * 0.04})`,
          }}
        />
      ))}
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
        <img alt="Anyware logo" src={logoAsset} />
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
