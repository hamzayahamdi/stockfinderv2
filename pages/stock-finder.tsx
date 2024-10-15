import Head from 'next/head';
import { StockFinderComponent } from '../components/stock-finder';

export default function StockFinder() {
  return (
    <>
      <Head>
        <title>Stock Finder V2</title>
        <link rel="icon" href="/sketch.svg" />
      </Head>
      <StockFinderComponent />
    </>
  );
}
