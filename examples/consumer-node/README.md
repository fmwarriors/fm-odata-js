# fm-odata-js Consumer Example

A comprehensive demonstration of using `fm-odata-js` (v0.1.6) in a Node.js environment via a local `file:` dependency. This example showcases all major milestones:

| Milestone | Feature | Demo in this example |
|-----------|---------|----------------------|
| M1-M2 | CRUD Queries | List rows from each table with `$top` and `$count` |
| M3 | Script Execution | Call the `Ping` script with a parameter |
| M4 | Container I/O | Download container field content |
| M5 | Metadata | Introspect the OData schema (`$metadata`) |
| M6 | Batch Operations | Multi-read + atomic changeset in one request |

## Test Database

A ready-to-host FileMaker file is bundled at [`../Contacts.fmp12`](../Contacts.fmp12).
Host it on an FMS instance with the OData API enabled, then point the example
at it using the env vars below.

> **Default credentials:** `admin` / `admin`
>
> These exist purely for local testing. **Change them before hosting the file
> on any network you do not fully control.**

## Setup

```bash
cd examples/consumer-node
npm install
```

`npm install` symlinks the parent `fm-odata-js` package into
`node_modules/fm-odata-js`, so any rebuild of the library (`npm run build` in
the repo root) is immediately visible to this example.

## Run

The example reads FMS connection settings from environment variables:

```bash
# Node 20.6+ can load .env natively
node --env-file=../../.env index.mjs

# Older Node: export the vars manually
export FM_ODATA_HOST=https://fms.example.com
export FM_ODATA_DATABASE=Contacts
export FM_ODATA_USER=your-fms-user
export FM_ODATA_PASSWORD=your-fms-password
export FM_ODATA_INSECURE_TLS=1   # only for self-signed LAN certs
node index.mjs
```

## Example Output

```text
[example] Connected to https://fms.example.com/Contacts

============================================================
1. BASIC QUERIES (M1-M2)
============================================================
contact   total=5  first 3 row(s):
  {id, first_name, last_name, email}
  {id, first_name, last_name, email}
  {id, first_name, last_name, email}

address   total=3  first 3 row(s):
  ...

============================================================
2. SCRIPT EXECUTION (M3)
============================================================
script    Ping => result="hello-from-fm-odata-js" error=0

============================================================
3. METADATA INTROSPECTION (M5)
============================================================
namespace: FileMaker
entitySets: 4 table(s)
  - contact (FileMaker.contact)
  - address (FileMaker.address)
  - email (FileMaker.email)
  - phone (FileMaker.phone)

entityTypes: 4 type(s)
  contact entity keys: [id]
  contact fields: 12
    sample: id, first_name, last_name, email, company...

============================================================
4. BATCH OPERATIONS (M6)
============================================================
batch     queued: 2 reads + 1 changeset (create)
batch     result: ALL OK
batch     responses: 3
  [0] status=200 ok=true
  [1] status=200 ok=true
  [2] status=201 ok=true
  read[0] returned 2 contact(s)

============================================================
5. CONTAINER FIELDS (M4)
============================================================
container using record id=42
container field URL: https://fms.example.com/fmi/odata/v4/Contacts/contact(42)/photo/$value
container field "photo" is empty or doesn't exist (this is OK)

============================================================
Example complete!
============================================================
```

## Feature Details

### M1-M2: Basic Queries

```ts
const { value, count } = await db.from('contact').top(3).count().get()
```

### M3: Script Execution

```ts
const { scriptResult, scriptError } = await db.script('Ping', {
  parameter: 'hello-from-fm-odata-js',
})
```

### M4: Container Fields

```ts
// Get a container reference
const container = db.from('contact').byKey(42).container('photo')

// Download
const { blob, filename, contentType, size } = await container.get()

// Upload (binary or base64 encoding)
await container.upload({
  data: fileBlob,
  filename: 'avatar.png',
  encoding: 'binary' // or 'base64' for arbitrary file types
})

// Clear
await container.delete()
```

### M5: Metadata

```ts
const meta = await db.metadata()

console.log(meta.namespace)        // "FileMaker"
console.log(meta.entitySets)       // All tables
console.log(meta.entityTypes)      // Field definitions
console.log(meta.actions)          // Exposed scripts
console.log(meta.raw)              // Original XML

// Force refresh
const fresh = await db.metadata({ refresh: true })

// Raw XML only
const xml = await db.metadataXml()
```

### M6: Batch Operations

```ts
const batch = db.batch()

// Queue reads
const contactsHandle = batch.add({
  op: 'list',
  entitySet: 'contact',
  query: { $top: 10, $filter: "status eq 'active'" }
})

// Queue atomic writes (changeset)
batch.changeset(cs => {
  cs.create('contact', { first_name: 'Alice', last_name: 'Liddell' })
  cs.patch('contact', 42, { status: 'archived' })
  cs.delete('invoice', 99)
})

// Send all at once
const result = await batch.send()

// Per-operation results
for (const r of result.responses) {
  console.log(r.status, r.ok, r.body)
}

// Or await individual handles
const contacts = await contactsHandle._promise
```

## TypeScript Variant

If your consumer project uses TypeScript, the same code works verbatim — the
library ships `.d.ts` files alongside the bundle. Simply:

```ts
import { FMOData, basicAuth, type QueryResult, type ODataMetadata } from 'fm-odata-js'

interface Contact {
  id: number
  first_name: string
  last_name: string
}

const db = new FMOData({ /* ... */ })
const result: QueryResult<Contact> = await db.from<Contact>('contact').top(5).get()
const meta: ODataMetadata = await db.metadata()
```

Autocomplete, type-checking, and go-to-definition all work out of the box.

## Script Setup

To exercise the script demo, add a script to the `Contacts` solution that simply
echoes its parameter:

```filemaker
# Script: "Ping"
Exit Script [Text Result: Get(ScriptParameter)]
```

If the script is missing the example detects FileMaker error `104` and prints
a "skipping" line instead of failing. Override the name via
`FM_ODATA_PING_SCRIPT` if your script is called something else.

## Container Field Setup

The container demo attempts to access a `photo` field on the `contact` table.
To test upload/download:

1. Add a container field named `photo` to the `contact` table
2. Set `FM_ODATA_DEMO_RECORD_ID` to a specific record ID, or let it auto-find one
3. Uncomment the upload section in `index.mjs` to test binary uploads
