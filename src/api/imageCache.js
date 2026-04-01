const DB_NAME = 'reval_image_cache'
const STORE_NAME = 'images'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getCachedImage(produto) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(produto)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function setCachedImage(produto, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(blob, produto)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function fetchAndCacheImage(produto) {
  // Check IndexedDB first
  const cached = await getCachedImage(produto)
  if (cached) {
    return URL.createObjectURL(cached)
  }

  // Fetch from server cache proxy
  const response = await fetch(`/cached-images/${produto}`)
  if (!response.ok) return null

  const blob = await response.blob()

  // Store in IndexedDB
  await setCachedImage(produto, blob)

  return URL.createObjectURL(blob)
}
