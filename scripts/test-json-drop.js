import fs from 'fs'
import { JsonDrop, JsonDropError } from '@wbruntra/json-drop'
import { JSON_DROP_BASE_URL, JSON_DROP_PROJECT_ID } from '../config.js'
import { JSON_DROP_API_TOKEN } from '../secrets.js'

const db = new JsonDrop({
  baseUrl: JSON_DROP_BASE_URL,
  token: JSON_DROP_API_TOKEN,
  project: JSON_DROP_PROJECT_ID,
})

async function main() {
  console.log('--- db.me() (returns null in guest mode, user when authed) ---')
  const me = await db.me()
  console.log(me)

  console.log('\n--- db.doc("sdk-test/concurrency").set() v1 ---')
  const created = await db.doc('sdk-test/concurrency').set({ count: 1 })
  console.log({ id: created.id, path: created.path, version: created.version })
  if (typeof created.version !== 'number') {
    console.error('!!! expected numeric version field')
    process.exit(1)
  }
  if (!created.ref || typeof created.ref.get !== 'function') {
    console.error('!!! expected bound ref on result')
    process.exit(1)
  }

  console.log('\n--- bound ref.get() on the created doc ---')
  const viaRef = await created.ref.get()
  console.log({ path: viaRef.path, version: viaRef.version, content: viaRef.content })

  console.log('\n--- stale-write rejection: set with old ifMatch should conflict ---')
  try {
    await db.doc('sdk-test/concurrency').set({ count: 2 }, { ifMatch: created.version - 1 })
    console.error('!!! expected conflict, none thrown')
    process.exit(1)
  } catch (e) {
    if (e instanceof JsonDropError && e.code === 'conflict') {
      console.log(`conflict as expected (status ${e.status}, code ${e.code})`)
    } else {
      throw e
    }
  }

  console.log('\n--- correct-write: set with current ifMatch should succeed & bump version ---')
  const updated = await db.doc('sdk-test/concurrency').set(
    { count: 2 },
    { ifMatch: created.version }
  )
  console.log({ version: updated.version })
  if (updated.version !== created.version + 1) {
    console.error(`!!! expected version ${created.version + 1}, got ${updated.version}`)
    process.exit(1)
  }

  console.log('\n--- list under prefix "sdk-test/" ---')
  const list = await db.collection('sdk-test').list({ prefix: 'sdk-test/' })
  console.log({ prefix: list.prefix, order: list.order, count: list.docs.length })
  if (list.order !== 'path_asc') {
    console.error(`!!! expected order 'path_asc', got '${list.order}'`)
    process.exit(1)
  }
  if (list.prefix !== 'sdk-test/') {
    console.error(`!!! expected echoed prefix 'sdk-test/', got '${list.prefix}'`)
    process.exit(1)
  }

  console.log('\n--- error code on missing doc ---')
  try {
    await db.doc('sdk-test/does-not-exist').get()
  } catch (e) {
    if (e instanceof JsonDropError && e.code === 'not_found') {
      console.log(`not_found as expected (status ${e.status})`)
    } else {
      throw e
    }
  }

  console.log('\n--- cleanup: delete with current ifMatch ---')
  await db.doc('sdk-test/concurrency').delete({ ifMatch: updated.version })
  console.log('deleted')

  console.log('\nAll SDK checks passed.')
}

main().catch((e) => {
  console.error('Unhandled error:', e)
  process.exit(1)
})