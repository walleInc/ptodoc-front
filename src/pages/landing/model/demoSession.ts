const STORAGE_KEY = 'pto_public_demo_used'

/** Одна бесплатная успешная проверка на браузер (localStorage). */
export function hasUsedPublicDemo(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markPublicDemoUsed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}
