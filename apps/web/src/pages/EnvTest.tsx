// Temporary test page to verify environment variables
export default function EnvTest() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasAnonKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Test</h1>
      <p><strong>VITE_SUPABASE_URL:</strong> {supabaseUrl || '❌ NOT SET'}</p>
      <p><strong>VITE_SUPABASE_ANON_KEY:</strong> {hasAnonKey ? '✅ SET' : '❌ NOT SET'}</p>
      <hr />
      <p>If you see "NOT SET" above, the .env file is not being loaded.</p>
      <p>Try stopping the server and running: <code>pnpm dev:web</code></p>
    </div>
  );
}
