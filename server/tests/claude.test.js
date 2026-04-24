import { describe, it, expect } from 'vitest'
import { parseJSON } from '../services/claude.js'

describe('Logic: parseJSON', () => {
  it('should parse clean JSON', () => {
    const input = '{"city": "Paris"}'
    expect(parseJSON(input)).toEqual({ city: 'Paris' })
  })

  it('should extract JSON from markdown blocks', () => {
    const input = 'Voici le résultat : ```json {"city": "Ibiza"} ```'
    expect(parseJSON(input)).toEqual({ city: 'Ibiza' })
  })

  it('should repair trailing commas', () => {
    const input = '{"list": [1, 2, 3,]}'
    expect(parseJSON(input)).toEqual({ list: [1, 2, 3] })
  })

  it('should throw error on invalid content', () => {
    const input = 'Ceci n\'est pas du JSON'
    expect(() => parseJSON(input)).toThrow()
  })
})
