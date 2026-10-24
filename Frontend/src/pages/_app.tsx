import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../components/Toast";
import { AuthProvider } from "../context/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
