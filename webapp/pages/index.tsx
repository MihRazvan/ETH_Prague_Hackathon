import Head from "next/head";
import Link from "next/link";

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
const installCharacterAsset = "https://www.figma.com/api/mcp/asset/dab23af3-18e7-48ac-9cfb-f7c4ade1b349";
const githubBackgroundAsset = "https://www.figma.com/api/mcp/asset/88a9a2b0-d03f-419f-b2b5-57206bfc1f75";
const githubPortraitAsset = "https://www.figma.com/api/mcp/asset/40e45857-dba9-4bee-b554-35f44eae66c3";
const githubGlitchTopAsset = "https://www.figma.com/api/mcp/asset/e80bd386-71da-4788-b0b1-4f25397c2c76";
const githubGlitchBottomAsset = "https://www.figma.com/api/mcp/asset/a1d0d896-e666-4d39-828d-bc644e27ff72";

const featureCards = [
  "Works with EVM out of the box.",
  "Verifies state directly via EIP-4788.",
  "Replaces trusted messaging.",
  "Keeps applications fully onchain.",
  "Eliminates bridge and oracles.",
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Anyware</title>
        <meta
          name="description"
          content="Trust Ethereum. Anywhere. Solidity verifier and TypeScript prover for trustless cross-chain reads."
        />
      </Head>

      <main className="lp">
        <section className="lpSection lpHeroSection">
          <CollageBackground />
          <div className="lpShell">
            <SiteNav />

            <div className="lpHeroLayout">
              <div className="lpHeroCopy">
                <p className="lpEyebrow">SOLIDITY LIBRARY AND TYPSCRIPT PROVER THAT LETS ROLLUPS VERIFY ETHEREUM STATE</p>
                <h1 className="lpHeroTitle">Trust Ethereum. Anywhere.</h1>
                <div className="lpHeroActions">
                  <Link className="lpPrimaryButton" href="/demo">
                    Use Anyware now!
                  </Link>
                </div>
              </div>

              <div className="lpHeroVisual" aria-hidden="true">
                <div className="lpHeroVisualAura" />
                <img className="lpHeroFigure" alt="" src={installCharacterAsset} />
              </div>
            </div>
          </div>
        </section>

        <section className="lpSection lpStatementSection" id="learn">
          <CollageBackground />
          <div className="lpShell">
            <SiteNav />

            <div className="lpStatementGrid">
              <div className="lpStatementTitle">
                <h2>
                  Ethereum was <span>never</span> meant to be <span>trusted</span> through <span>middleman</span>.
                </h2>
              </div>

              <div className="lpStatementAside">
                <p>
                  It is a cross-chain verification system that lets any rollup verify Ethereum facts directly against consensus.
                </p>
                <Link className="lpPrimaryButton" href="/demo">
                  accept
                </Link>
              </div>
            </div>

            <div className="lpStatementBand">
              <span>No messages.</span>
              <span>No assumptions.</span>
              <span>No trust layers in between.</span>
            </div>

            <div className="lpStatementFooter">
              <p>Just Ethereum, proven.</p>
            </div>
          </div>
        </section>

        <section className="lpSection lpFeaturesSection">
          <CollageBackground />
          <div className="lpShell">
            <SiteNav />

            <div className="lpFeaturesHeader">
              <h2>
                Cross-chain truth was never native.
                <span>{">>> Until Now!"}</span>
              </h2>
            </div>

            <div className="lpFeatureGrid">
              {featureCards.map((card, index) => (
                <article className="lpFeatureCard" key={card}>
                  <div className="lpFeatureMock" aria-hidden="true">
                    <div className="lpFeatureMockTop" />
                    <div className="lpFeatureMockCenter">{index + 1}</div>
                    <div className="lpFeatureMockBottom" />
                  </div>
                  <p>{card}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lpSection lpInstallSection">
          <CollageBackground />
          <div className="lpShell">
            <SiteNav />

            <div className="lpInstallHeader">
              <div>
                <h2>
                  One proof.
                  <br />
                  Any chain.
                </h2>
              </div>
              <div className="lpInstallCopy">
                <p>Verify Ethereum state anywhere in just a single call.</p>
                <span>{"<3"}</span>
              </div>
            </div>

            <div className="lpInstallBand">
              bundle of proofs → verify against consensus → execute onchain
            </div>

            <div className="lpInstallCommands">
              <code>npm install anyware-prover</code>
              <code>npm install anyware-solidity</code>
            </div>

            <img
              alt=""
              className="lpInstallCharacter"
              src={installCharacterAsset}
            />
          </div>
        </section>

        <section className="lpSection lpGithubSection">
          <CollageBackground />
          <div className="lpShell">
            <SiteNav />

            <div className="lpGithubShowcase">
              <div className="lpGithubBackground">
                <img alt="" src={githubBackgroundAsset} />
              </div>
              <div className="lpGithubPortrait">
                <img alt="" className="lpGithubPortraitBase" src={githubPortraitAsset} />
                <img alt="" className="lpGithubPortraitTop" src={githubGlitchTopAsset} />
                <img alt="" className="lpGithubPortraitBottom" src={githubGlitchBottomAsset} />
              </div>
              <div className="lpGithubCopy">
                <p>This user got door knocked for bringing Ethereum truth anywhere.</p>
              </div>
            </div>

            <div className="lpGithubActions">
              <a
                className="lpGithubButton"
                href="https://github.com/MihRazvan/ETH_Prague_Hackathon"
                rel="noreferrer"
                target="_blank"
              >
                [View GitHub]
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function SiteNav() {
  return (
    <div className="lpNav">
      <div className="lpNavBrand">
        <img alt="Anyware logo" src={logoAsset} />
        <span>anyware</span>
      </div>
      <div className="lpNavLinks">
        <Link href="/demo">try</Link>
        <Link href="/learn">learn</Link>
      </div>
    </div>
  );
}

function CollageBackground() {
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
