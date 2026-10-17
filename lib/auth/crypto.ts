import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM with GOOGLE_TOKEN_KEY (32 bytes, base64). Stored as "iv.tag.ciphertext" in base64.
const key = () => Buffer.from(process.env.GOOGLE_TOKEN_KEY ?? '', 'base64')

export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.')
}

export function decrypt(stored: string): string {
  const [iv, tag, data] = stored.split('.').map((s) => Buffer.from(s, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
