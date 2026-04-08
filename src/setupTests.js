import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = (() => {
  let store = {}

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

global.localStorage = localStorageMock

// Mock matchMedia (used by some UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Suppress console errors in tests (optional - remove if you want to see them)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn()

// Mock DOMMatrix (required by pdfjs-dist)
class DOMMatrixMock {
  constructor() {
    this.a = 1
    this.b = 0
    this.c = 0
    this.d = 1
    this.e = 0
    this.f = 0
  }
  static fromMatrix() {
    return new DOMMatrixMock()
  }
  static fromFloat32Array() {
    return new DOMMatrixMock()
  }
  static fromFloat64Array() {
    return new DOMMatrixMock()
  }
  translate() { return this }
  scale() { return this }
  rotate() { return this }
  multiply() { return this }
  inverse() { return this }
}
global.DOMMatrix = DOMMatrixMock

// Mock Path2D (required by pdfjs-dist)
class Path2DMock {
  constructor() {}
  addPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  arc() {}
  arcTo() {}
  ellipse() {}
  rect() {}
}
global.Path2D = Path2DMock
