import Head from "next/head";
import Link from "next/link";

import { CollageBackground, SiteNav } from "../components/SiteChrome";

const githubBackgroundAsset = "https://www.figma.com/api/mcp/asset/88a9a2b0-d03f-419f-b2b5-57206bfc1f75";
const githubPortraitAsset = "https://www.figma.com/api/mcp/asset/40e45857-dba9-4bee-b554-35f44eae66c3";
const githubGlitchTopAsset = "https://www.figma.com/api/mcp/asset/e80bd386-71da-4788-b0b1-4f25397c2c76";
const githubGlitchBottomAsset = "https://www.figma.com/api/mcp/asset/a1d0d896-e666-4d39-828d-bc644e27ff72";

const featureFrames = [
  "/landing/Frame_1.png",
  "/landing/Frame_2.png",
  "/landing/Frame_3.png",
  "/landing/Frame_4.png",
  "/landing/Frame_5.png",
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
        <div className="lpGlobalNav">
          <div className="lpShell lpNavShell">
            <SiteNav />
          </div>
        </div>

        <section className="lpSection lpHeroSection">
          <CollageBackground />
          <div className="lpShell">
            <div className="lpHeroLayout">
              <div className="lpHeroCopy">
                <h1 className="lpHeroTitle">
                  Trust Ethereum.
                  <br />
                  Anywhere.
                </h1>
                <p className="lpEyebrow">
                  SOLIDITY LIBRARY AND TYPESCRIPT PROVER
                  <br />
                  THAT LETS ROLLUPS VERIFY ETHEREUM STATE
                </p>
                <div className="lpHeroActions">
                  <Link className="lpPrimaryButton" href="/demo">
                    Try Anyware now!
                  </Link>
                </div>
              </div>

              <div className="lpHeroVisual" aria-hidden="true">
                <img className="lpHeroFigure" alt="" src="/landing/character-section-1-2000.png" />
              </div>
            </div>
          </div>
        </section>

        <section className="lpSection lpStatementSection" id="learn">
          <CollageBackground />
          <div className="lpShell">
            <div className="lpStatementScene">
              <div className="lpStatementGrid">
                <div className="lpStatementTitle">
                  <h2>
                    Ethereum was <span>never</span>
                    <br />
                    meant to be <span>trust</span>ed
                    <br />
                    through <span>middleman</span>.
                  </h2>
                  <p className="lpStatementIntro">
                    Anyware lets L2s read Ethereum directly.
                    <br />
                    No priests. No federation. No "trust me
                    <br />
                    bro" middleware.
                  </p>
                </div>

                <div className="lpStatementAside">
                  <p>
                    It is a cross-chain verification
                    <br />
                    system that lets any rollup verify
                    <br />
                    Ethereum facts directly against
                    <br />
                    consensus.
                  </p>
                </div>
              </div>

              <div className="lpStatementBand">
                <span>No relayers.</span>
                <span>No multisigs.</span>
                <span>No oracle committees.</span>
              </div>

              <div className="lpStatementFooter">
                <p>Just Ethereum, proven.</p>
                <Link className="lpPrimaryButton" href="/demo">
                  accept
                </Link>
              </div>

            </div>
          </div>
          <img
            alt=""
            className="lpStatementCharacter"
            src="/landing/character-section-2-1800.png"
          />
        </section>

        <section className="lpSection lpFeaturesSection">
          <CollageBackground />
          <div className="lpShell">
            <div className="lpFeaturesHeader">
              <h2>
                Cross-chain was
                <br />
                spiritually broken.
                <span>{">>> Until Now!"}</span>
              </h2>
            </div>

            <div className="lpFeatureGrid">
              {featureFrames.map((frame) => (
                <img className="lpFeatureFrame" key={frame} alt="" src={frame} />
              ))}
            </div>
          </div>
        </section>

        <section className="lpSection lpInstallSection">
          <CollageBackground />
          <div className="lpShell">
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
              src="/landing/character-section-1-2000.png"
            />
          </div>
        </section>

        <section className="lpSection lpGithubSection">
          <CollageBackground />
          <div className="lpShell">
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
