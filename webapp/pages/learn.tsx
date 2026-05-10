import type { GetServerSideProps } from "next";

const GAME_URL = "https://eth-prague-hackathon.vercel.app/";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: GAME_URL,
      permanent: false,
    },
  };
};

export default function LearnRedirectPage() {
  return null;
}
