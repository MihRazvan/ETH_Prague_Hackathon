import Head from "next/head";

export default function GamePage() {
  return (
    <>
      <Head>
        <title>Anyware Game</title>
      </Head>
      <main className="simplePage">
        <section className="panel simplePanel">
          <p className="badge">Side Quest</p>
          <h1 className="title">/game</h1>
          <p className="subtitle">
            The game lives in the `game/` package in this repo. We can wire this route directly into the shipped game next.
          </p>
        </section>
      </main>
    </>
  );
}
