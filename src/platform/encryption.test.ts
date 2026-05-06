import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret, loadEncryptionKey } from './encryption'

describe('encrypted secret round trips', () => {
  it('encrypts and decrypts with aes-256-gcm', () => {
    const key = randomBytes(32)
    const encrypted = encryptSecret('do-not-store-plaintext', key)

    expect(encrypted.algorithm).toBe('aes-256-gcm')
    expect(encrypted.ciphertext).not.toContain('do-not-store-plaintext')
    expect(decryptSecret(encrypted, key)).toBe('do-not-store-plaintext')
  })

  it('loads base64 and hex encoded 32 byte keys', () => {
    const key = randomBytes(32)

    expect(loadEncryptionKey(key.toString('base64'))).toEqual(key)
    expect(loadEncryptionKey(key.toString('hex'))).toEqual(key)
  })
})
