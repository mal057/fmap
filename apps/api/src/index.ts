/**
 * FishMap API - Cloudflare Workers
 * Handles waypoint uploads, storage, and retrieval
 */

interface Env {
  WAYPOINTS_BUCKET: R2Bucket;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/' && request.method === 'GET') {
        return new Response(
          JSON.stringify({
            name: 'FishMap API',
            version: '1.0.0',
            status: 'running',
            environment: env.ENVIRONMENT,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Upload waypoint file
      if (path === '/api/waypoints/upload' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'No file provided' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        // Store file in R2
        const fileKey = `uploads/${Date.now()}-${file.name}`;
        await env.WAYPOINTS_BUCKET.put(fileKey, file.stream());

        return new Response(
          JSON.stringify({
            success: true,
            fileKey,
            fileName: file.name,
            size: file.size,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Get waypoints list
      if (path === '/api/waypoints' && request.method === 'GET') {
        const list = await env.WAYPOINTS_BUCKET.list({ prefix: 'uploads/' });

        const waypoints = list.objects.map(obj => ({
          key: obj.key,
          uploaded: obj.uploaded,
          size: obj.size,
        }));

        return new Response(
          JSON.stringify({ waypoints }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Download waypoint file
      if (path.startsWith('/api/waypoints/download/') && request.method === 'GET') {
        const fileKey = path.replace('/api/waypoints/download/', '');
        const object = await env.WAYPOINTS_BUCKET.get(fileKey);

        if (!object) {
          return new Response(
            JSON.stringify({ error: 'File not found' }),
            {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        return new Response(object.body, {
          headers: {
            'Content-Type': 'application/octet-stream',
            ...corsHeaders,
          },
        });
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};
