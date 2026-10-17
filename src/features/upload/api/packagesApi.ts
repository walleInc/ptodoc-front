import axios, { type AxiosProgressEvent } from 'axios'
import { api } from '@/shared'
import type { Package, PackageCreate, PackageCreated, PackageDetail, UploadTarget } from '@/entities/package'

export const packagesApi = {
  list: async (objectId: string): Promise<Package[]> => {
    const response = await api.get<Package[]>(`/objects/${objectId}/packages`)
    return response.data
  },

  create: async (objectId: string, body: PackageCreate): Promise<PackageCreated> => {
    const response = await api.post<PackageCreated>(`/objects/${objectId}/packages`, body)
    return response.data
  },

  start: async (packageId: string): Promise<Package> => {
    const response = await api.post<Package>(`/packages/${packageId}/start`)
    return response.data
  },

  getById: async (packageId: string): Promise<PackageDetail> => {
    const response = await api.get<PackageDetail>(`/packages/${packageId}`)
    return response.data
  },
}

/**
 * PUT файла по presigned URL. Намеренно обычный axios, не `api`:
 * без baseURL и cookie-сессии (запрос идёт в хранилище, а не в наш бэк).
 */
export async function uploadToStorage(
  target: UploadTarget,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!target.uploadUrl) return
  // Content-Type / headers с бэка должны совпадать с mimeType при создании пакета
  await axios.put(target.uploadUrl, file, {
    headers: { 'Content-Type': file.type, ...target.headers },
    signal,
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}
