import { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <Head>
        <title>Rewordly API</title>
        <meta name="description" content="Rewordly Chrome Extension Backend API" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Rewordly API</h1>
        <p>This is the backend API for the Rewordly Chrome Extension.</p>
        <p>Use the <code>/api/rewrite</code> endpoint to rewrite text using OpenAI.</p>
        
        <h2>API Endpoint</h2>
        <p><strong>POST</strong> <code>/api/rewrite</code></p>
        
        <h3>Request Body</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`{
  "text": "Your text to rewrite here"
}`}
        </pre>
        
        <h3>Response</h3>
        <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`{
  "rewritten": "Your rewritten text here"
}`}
        </pre>
      </main>
    </div>
  );
};

export default Home; 