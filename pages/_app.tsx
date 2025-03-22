import { LicenseInfo } from '@mui/x-license-pro';
import { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

// Set the MUI X license key
if (process.env.NEXT_PUBLIC_MUI_LICENSE_KEY) {
  LicenseInfo.setLicenseKey(process.env.NEXT_PUBLIC_MUI_LICENSE_KEY);
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
