/**
 * Lightweight Supabase REST API client for Cloudflare Workers
 * Implements core functionality without heavy dependencies
 */

/**
 * Response type matching Supabase SDK convention
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count?: number | null;
}

/**
 * Error type matching Supabase SDK convention
 */
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Query builder for chaining operations
 */
class SupabaseQueryBuilder<T = any> {
  private url: string;
  private apiKey: string;
  private table: string;
  private queryParams: URLSearchParams;
  private method: string = 'GET';
  private body: any = null;
  private preferHeaders: string[] = [];

  constructor(url: string, apiKey: string, table: string) {
    this.url = url;
    this.apiKey = apiKey;
    this.table = table;
    this.queryParams = new URLSearchParams();
  }

  /**
   * Select columns from table
   * @param columns - Comma-separated column names or '*' for all
   * @param options - Query options including count
   */
  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }): this {
    this.method = 'GET';
    this.queryParams.set('select', columns);

    // Add count preference if requested
    if (options?.count) {
      this.preferHeaders.push(`count=${options.count}`);
    }

    return this;
  }

  /**
   * Insert new rows
   * @param data - Single object or array of objects to insert
   */
  insert(data: T | T[]): this {
    this.method = 'POST';
    this.body = data;
    this.preferHeaders.push('return=representation');
    return this;
  }

  /**
   * Update existing rows
   * @param data - Object with columns to update
   */
  update(data: Partial<T>): this {
    this.method = 'PATCH';
    this.body = data;
    this.preferHeaders.push('return=representation');
    return this;
  }

  /**
   * Delete rows
   */
  delete(): this {
    this.method = 'DELETE';
    this.preferHeaders.push('return=representation');
    return this;
  }

  /**
   * Filter rows where column equals value
   * @param column - Column name
   * @param value - Value to match
   */
  eq(column: string, value: any): this {
    this.queryParams.set(column, `eq.${value}`);
    return this;
  }

  /**
   * Limit number of rows returned
   * @param count - Maximum number of rows
   */
  limit(count: number): this {
    this.queryParams.set('limit', count.toString());
    return this;
  }

  /**
   * Order results
   * @param column - Column to order by
   * @param options - Ordering options
   */
  order(column: string, options?: { ascending?: boolean }): this {
    const ascending = options?.ascending ?? true;
    this.queryParams.set('order', `${column}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  /**
   * Range pagination (offset-limit)
   * @param from - Starting index (inclusive)
   * @param to - Ending index (inclusive)
   */
  range(from: number, to: number): this {
    this.preferHeaders.push(`Range=${from}-${to}`);
    return this;
  }

  /**
   * Apply OR filter
   * @param filter - OR filter expression (e.g., "column1.eq.value1,column2.eq.value2")
   */
  or(filter: string): this {
    this.queryParams.set('or', `(${filter})`);
    return this;
  }

  /**
   * Return only a single row
   */
  single(): this {
    this.preferHeaders.push('return=representation');
    // For single() we need to set the Accept header to return a single object
    // This will be handled in the execute method
    return this;
  }

  /**
   * Execute the query
   */
  async execute(): Promise<SupabaseResponse<T>> {
    try {
      // Build URL with query parameters
      const endpoint = `${this.url}/rest/v1/${this.table}`;
      const url = this.queryParams.toString()
        ? `${endpoint}?${this.queryParams.toString()}`
        : endpoint;

      // Build headers
      const headers: Record<string, string> = {
        'apikey': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      // Add Prefer header if we have preferences
      if (this.preferHeaders.length > 0) {
        headers['Prefer'] = this.preferHeaders.join(',');
      }

      // Make request
      const response = await fetch(url, {
        method: this.method,
        headers,
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      // Parse response
      const contentType = response.headers.get('content-type');
      const hasJsonContent = contentType && contentType.includes('application/json');

      // Handle error responses
      if (!response.ok) {
        let errorData: any = null;

        if (hasJsonContent) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
        }

        return {
          data: null,
          error: {
            message: errorData.message || `Request failed with status ${response.status}`,
            details: errorData.details,
            hint: errorData.hint,
            code: errorData.code || response.status.toString(),
          },
        };
      }

      // Handle successful responses
      if (hasJsonContent) {
        const data = await response.json();

        // Extract count from Content-Range header if present
        const contentRange = response.headers.get('content-range');
        let count: number | null = null;

        if (contentRange) {
          // Content-Range format: "0-9/42" where 42 is the total count
          const match = contentRange.match(/\/(\d+)$/);
          if (match) {
            count = parseInt(match[1], 10);
          }
        }

        return {
          data: data as T,
          error: null,
          count,
        };
      }

      // No content (e.g., DELETE with no return)
      return {
        data: null,
        error: null,
      };
    } catch (error) {
      // Network or other errors
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  /**
   * Execute and return the result (convenience method)
   * This makes the query builder thenable so it can be awaited directly
   */
  then<TResult1 = SupabaseResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

/**
 * Supabase client interface
 */
export interface SupabaseClient {
  /**
   * Start a query on a table
   */
  from<T = any>(table: string): SupabaseQueryBuilder<T>;

  /**
   * Execute raw RPC function call
   */
  rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<SupabaseResponse<T>>;
}

/**
 * Create a Supabase REST API client
 *
 * @param url - Supabase project URL (e.g., https://xxx.supabase.co)
 * @param key - API key (anon key for RLS enforcement, service key to bypass RLS)
 * @returns Supabase client instance
 *
 * @example
 * ```typescript
 * // Using service key (bypasses RLS)
 * const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
 *
 * // Insert data
 * const { data, error } = await supabase
 *   .from('files')
 *   .insert({ filename: 'test.gpx', user_id: '123' })
 *   .single();
 *
 * // Query data
 * const { data, error } = await supabase
 *   .from('files')
 *   .select('*')
 *   .eq('user_id', '123')
 *   .limit(10);
 * ```
 */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  // Remove trailing slash from URL if present
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;

  return {
    from<T = any>(table: string): SupabaseQueryBuilder<T> {
      return new SupabaseQueryBuilder<T>(baseUrl, key, table);
    },

    async rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<SupabaseResponse<T>> {
      try {
        const endpoint = `${baseUrl}/rest/v1/rpc/${functionName}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: params ? JSON.stringify(params) : undefined,
        });

        const contentType = response.headers.get('content-type');
        const hasJsonContent = contentType && contentType.includes('application/json');

        if (!response.ok) {
          let errorData: any = null;

          if (hasJsonContent) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            errorData = { message: text || `HTTP ${response.status}: ${response.statusText}` };
          }

          return {
            data: null,
            error: {
              message: errorData.message || `RPC call failed with status ${response.status}`,
              details: errorData.details,
              hint: errorData.hint,
              code: errorData.code || response.status.toString(),
            },
          };
        }

        if (hasJsonContent) {
          const data = await response.json();
          return {
            data: data as T,
            error: null,
          };
        }

        return {
          data: null,
          error: null,
        };
      } catch (error) {
        return {
          data: null,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            details: error instanceof Error ? error.stack : undefined,
          },
        };
      }
    },
  };
}
