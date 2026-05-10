import Head from "next/head";

export default function DemoPage() {
  return (
    <>
      <Head>
        <title>Anyware Demo</title>
      </Head>
      <main className="simplePage">
        <section className="panel simplePanel">
          <p className="badge">Coming Next</p>
          <h1 className="title">/demo</h1>
          <p className="subtitle">
            This route is intentionally empty for now. It will host the live proof flow and verification showcase.
          </p>
        </section>
      </main>
    </>
  );
}
