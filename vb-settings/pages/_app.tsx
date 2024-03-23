import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import ReactQueryProvider from "../providers/query";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Vestaboard Settings</title>
        <meta name="description" content="Go Away" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ReactQueryProvider>
        <Component {...pageProps} />
      </ReactQueryProvider>
    </>
  );
}
export default MyApp;
