import Head from 'next/head';
import { StockFinder } from '../components/stock-finder';

export default function StockFinderPage() {
  return (
    <>
      <Head>
        <title>Stock Finder V2</title>
        <link rel="icon" href="/sketch.svg" />
      </Head>
      <StockFinder />
    </>
  );
}
