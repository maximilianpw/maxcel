# Convex Store Adapter

Future Convex persistence adapter code belongs here.

This folder should contain the Maxcel adapter that implements the shared
`PlatformStore` contract from `../types`. Do not model Convex with raw SQL or
treat the Postgres schema as the source of truth.

The Convex database schema lives at the repo root in `convex/schema.ts` and uses
Convex `defineSchema`, `defineTable`, `v` validators, and table indexes.
