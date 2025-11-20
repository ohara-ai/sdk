/**
 * Custom Test Assertions and Utilities
 *
 * Provides reusable assertion helpers for SDK testing
 */

import { expect } from 'vitest'
import type { Address } from 'viem'

/**
 * Assert that a value is a valid Ethereum address
 */
export function assertValidAddress(value: unknown): asserts value is Address {
  expect(value).toMatch(/^0x[a-fA-F0-9]{40}$/)
}

/**
 * Assert that a value is a valid transaction hash
 */
export function assertValidHash(value: unknown): asserts value is string {
  expect(value).toMatch(/^0x[a-fA-F0-9]{64}$/)
}

/**
 * Assert that a bigint is positive
 */
export function assertPositiveBigInt(value: bigint) {
  expect(value).toBeTypeOf('bigint')
  expect(value > 0n).toBe(true)
}

/**
 * Assert that an object has all required properties
 */
export function assertHasProperties<T extends Record<string, unknown>>(
  obj: unknown,
  properties: (keyof T)[],
): asserts obj is T {
  expect(obj).toBeTypeOf('object')
  expect(obj).not.toBeNull()
  properties.forEach((prop) => {
    expect(obj).toHaveProperty(prop as string)
  })
}

/**
 * Assert that operations object has expected methods
 */
export function assertHasOperations(operations: unknown, methods: string[]) {
  expect(operations).toBeTypeOf('object')
  expect(operations).not.toBeNull()
  methods.forEach((method) => {
    expect(operations).toHaveProperty(method)
    expect(typeof (operations as any)[method]).toBe('function')
  })
}
