import Head from 'next/head';
import { SoldProducts } from '../components/sold-products';

export default function SoldProductsPage() {
  return (
    <>
      <Head>
        <title>SOLD PRODUCTS V2</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SoldProducts />
    </>
  );
}
