import Head from 'next/head';
import { StockIndexComponent } from '../components/stock-index';

export default function StockIndex() {
  return (
    <>
      <Head>
        <title>Stock Index V2</title>
        <link rel="icon" href="/index.svg" />
      </Head>
      <StockIndexComponent />
    </>
  );
}
