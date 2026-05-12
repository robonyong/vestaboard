import "../styles/globals.css";
import {
  createTheme,
  CssBaseline,
  ThemeProvider,
} from "@mui/material";
import Head from "next/head";
import type { AppProps } from "next/app";
import ReactQueryProvider from "../providers/query";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1f2122",
      paper: "#272a2c",
    },
    primary: {
      main: "#f5f5f5",
    },
    text: {
      primary: "#f5f5f5",
      secondary: "#c7c9cb",
      disabled: "#85898c",
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#c7c9cb",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255, 255, 255, 0.03)",
        },
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Vestaboard Settings</title>
        <meta name="description" content="Go Away" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ReactQueryProvider>
          <Component {...pageProps} />
        </ReactQueryProvider>
      </ThemeProvider>
    </>
  );
}
export default MyApp;
