import { HomePage } from '../components/home-page'
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Sketch APPS</title>
        <meta name="description" content="Sketch Design Applications" />
      </Head>
      <HomePage />
    </>
  )
}
