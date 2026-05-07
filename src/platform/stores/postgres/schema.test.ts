import { describe, expect, it } from 'vitest'
import {
  COMPONENT_KINDS,
  DEPLOY_STATUSES,
  PROVIDER_IDS,
  PR_STATUSES,
} from '../../constants'
import { POSTGRES_SCHEMA_SQL } from './schema'

describe('Postgres schema SQL', () => {
  it('uses shared platform constants for check constraints', () => {
    const providerCheck = `provider text not null check (provider in (${sqlCheckList(PROVIDER_IDS)}))`

    expect(POSTGRES_SCHEMA_SQL).toContain(
      `kind text not null check (kind in (${sqlCheckList(COMPONENT_KINDS)}))`,
    )
    expect(countOccurrences(POSTGRES_SCHEMA_SQL, providerCheck)).toBe(2)
    expect(POSTGRES_SCHEMA_SQL).toContain(
      `pr_status text not null check (pr_status in (${sqlCheckList(PR_STATUSES)}))`,
    )
    expect(POSTGRES_SCHEMA_SQL).toContain(
      `status text not null check (status in (${sqlCheckList(DEPLOY_STATUSES)}))`,
    )
  })
})

function sqlCheckList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ')
}

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1
}
