import { Batch } from './batch.js';
import { type HttpClientContext, type HttpRequestOptions } from './http.js';
import { type MetadataOptions, type ODataMetadata } from './metadata.js';
import { Query } from './query.js';
import { type ScriptOptions, type ScriptResult } from './scripts.js';
import type { FMODataOptions, RequestOptions } from './types.js';
/**
 * `FMOData` is the entrypoint for all OData operations against a FileMaker
 * Server database. Covers query/CRUD, script invocation, container I/O,
 * `$metadata` introspection, and `$batch` operations.
 */
export declare class FMOData {
    readonly host: string;
    readonly database: string;
    readonly baseUrl: string;
    readonly timeoutMs: number | undefined;
    /** @internal */ readonly _ctx: HttpClientContext;
    /** @internal */ private _metadataFetcher?;
    constructor(options: FMODataOptions);
    /**
     * Start a query against the given entity set (FileMaker layout name).
     */
    from<T = Record<string, unknown>>(entitySet: string): Query<T>;
    /**
     * Low-level escape hatch: execute a raw request against a path relative to
     * the database base URL (or an absolute URL). Returns the parsed JSON body.
     *
     * @example
     * ```ts
     * const body = await db.request<{ value: unknown[] }>('/contact?$top=1')
     * ```
     */
    request<T = unknown>(pathOrUrl: string, opts?: HttpRequestOptions): Promise<T>;
    /**
     * Low-level escape hatch: execute a raw request and return the `Response`
     * object directly (useful for binary / streaming responses).
     */
    rawRequest(pathOrUrl: string, opts?: HttpRequestOptions): Promise<Response>;
    /**
     * Invoke a FileMaker script at database scope.
     *
     * ```ts
     * const result = await db.script('Ping', { parameter: 'hello' })
     * console.log(result.scriptResult) // => string value returned by the script
     * ```
     *
     * A non-zero `scriptError` is thrown as `FMScriptError`.
     */
    script(name: string, opts?: ScriptOptions): Promise<ScriptResult>;
    /**
     * Fetch the OData CSDL `$metadata` XML and parse it into a typed structure.
     * Results are cached; pass `refresh: true` to force a refetch.
     *
     * ```ts
     * const meta = await db.metadata()
     * console.log(meta.entitySets.map(es => es.name))
     * ```
     */
    metadata(opts?: MetadataOptions): Promise<ODataMetadata>;
    /**
     * Fetch the raw `$metadata` XML (escape hatch for debugging or custom parsing).
     */
    metadataXml(opts?: RequestOptions): Promise<string>;
    /**
     * Create a new `$batch` builder for composing multiple OData operations
     * into a single HTTP round-trip.
     *
     * Read operations (`add`) are executed independently. Write operations
     * (`changeset`) are grouped atomically — all succeed or all fail.
     *
     * ```ts
     * const batch = db.batch()
     * const contacts = batch.add({ op: 'list', entitySet: 'contact', query: { $top: 5 } })
     * batch.changeset(cs => {
     *   cs.create('contact', { firstName: 'A', lastName: 'B' })
     *   cs.patch('contact', 123, { firstName: 'Updated' })
     * })
     * const result = await batch.send()
     * console.log(await contacts._promise) // First op result
     * ```
     */
    batch(): Batch;
    /** @internal */
    _resolveUrl(pathOrUrl: string): string;
}
export type { RequestOptions };
//# sourceMappingURL=client.d.ts.map