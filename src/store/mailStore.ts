import { create } from 'zustand'
import axios from 'axios'
import { useAccountStore } from './accountStore'

// --- Configuration ---
const BASE_URL =
    import.meta.env.VITE_BASE_URL || 'https://5bdbcf6fc7d1.ngrok-free.app/api'

// --- Helper: Get Token Safely ---
const getToken = () => {
    // 1. Try getting from active Zustand store memory (Fastest)
    const state = useAccountStore.getState()
    let token = state.user?.token || state.userProfile?.token

    // 2. Fallback: Try parsing from LocalStorage if memory is empty
    if (!token) {
        try {
            const storageKey = 'account-storage'
            const storedString = localStorage.getItem(storageKey)

            if (storedString) {
                const parsed = JSON.parse(storedString)
                token =
                    parsed.state?.user?.token ||
                    parsed.state?.userProfile?.token
            }
        } catch (error) {
            console.warn('Failed to parse token from local storage', error)
        }
    }

    return token || ''
}

// --- Helper: Get Auth Headers ---
const getAuthHeaders = () => {
    const token = getToken()

    return {
        'ngrok-skip-browser-warning': 'true',
        Authorization: `Bearer ${token}`,
        accept: '*/*',
    }
}

// --- Types ---
export type MailState = {
    isLoading: boolean
    mails: any[]
    currentMail: any | null

    // Actions
    createMail: (formData: FormData) => Promise<boolean>
    createRegistry: (formData: FormData) => Promise<boolean> // New
    getAllMails: (filters?: any) => Promise<void>
    getMailByUid: (uid: string) => void
    updateMail: (uid: string, payload: any) => Promise<boolean>
    deleteMail: (uid: string) => Promise<boolean> // New

    // Sending
    sendMail: (uid: string) => Promise<boolean>
    sendMailById: (id: string, uid: string) => Promise<boolean> // New (Adapter)

    // Details & Downloads
    fetchMailDetails: (uid: string) => Promise<any>
    downloadMailPdf: (uid: string) => Promise<string | null> // New
    downloadReceiptPdf: (uid: string) => Promise<string | null> // New
}

// --- Store Implementation ---
export const useMailStore = create<MailState>((set, get) => ({
    isLoading: false,
    mails: [],
    currentMail: null,

    // 1. Create Mail
    createMail: async (formData: FormData) => {
        set({ isLoading: true })
        try {
            await axios.post(`${BASE_URL}/mail`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            })
            return true
        } catch (error) {
            console.error('Create Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 2. Create Registry (New)
    createRegistry: async (formData: FormData) => {
        set({ isLoading: true })
        try {
            // Adjust endpoint if your registry creation URL is different
            await axios.post(`${BASE_URL}/mail/registry`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data',
                },
            })
            return true
        } catch (error) {
            console.error('Create Registry Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 3. Get All Mails
    getAllMails: async (filters = {}) => {
        set({ isLoading: true })
        try {
            const queryParams: Record<string, any> = {}

            if (filters.startDate) queryParams.StartDate = filters.startDate
            if (filters.endDate) queryParams.EndDate = filters.endDate
            if (typeof filters.isSend === 'boolean')
                queryParams.IsSend = filters.isSend

            // ID Filters
            if (filters.regionId > 0) queryParams.RegionId = filters.regionId
            if (filters.areaId > 0) queryParams.AreaId = filters.areaId
            if (filters.organizationId > 0)
                queryParams.OrganizationId = filters.organizationId
            if (filters.branchId > 0) queryParams.BranchId = filters.branchId
            if (filters.creatorUserId > 0)
                queryParams.CreatorUserId = filters.creatorUserId
            if (filters.senderUserId > 0)
                queryParams.SenderUserId = filters.senderUserId

            const response = await axios.get(`${BASE_URL}/mail`, {
                headers: getAuthHeaders(),
                params: queryParams,
            })

            if (response.status === 200 && Array.isArray(response.data)) {
                set({ mails: response.data })
            } else {
                set({ mails: [] })
            }
        } catch (error) {
            console.error('Get All Mails Error:', error)
            set({ mails: [] })
        } finally {
            set({ isLoading: false })
        }
    },

    // 4. Get Single Mail (Local)
    getMailByUid: (uid: string) => {
        const { mails } = get()
        if (mails.length > 0) {
            const found = mails.find((m: any) => m.uid === uid) || null
            set({ currentMail: found })
        }
    },

    // 5. Update Mail
    updateMail: async (uid: string, payload: any) => {
        set({ isLoading: true })
        try {
            const url = `${BASE_URL}/mail/update/${uid}`

            const bodyData = {
                receiverName: payload.receiverName,
                receiverAddress: payload.receiverAddress,
                pagesCount: Number(payload.pagesCount || 1),
                regionId: Number(payload.regionId || 0),
                areaId: Number(payload.areaId || 0),
            }

            await axios.patch(url, bodyData, {
                headers: getAuthHeaders(),
            })
            return true
        } catch (error) {
            console.error('Update Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 6. Delete Mail (New)
    deleteMail: async (uid: string) => {
        set({ isLoading: true })
        try {
            const url = `${BASE_URL}/mail/${uid}`
            await axios.delete(url, { headers: getAuthHeaders() })

            // Optimistic update: remove from local state
            const currentMails = get().mails
            set({ mails: currentMails.filter((m) => m.uid !== uid) })

            return true
        } catch (error) {
            console.error('Delete Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 7. Send Mail
    sendMail: async (uid: string) => {
        set({ isLoading: true })
        try {
            const url = `${BASE_URL}/mail/send/${uid}`
            await axios.patch(url, {}, { headers: getAuthHeaders() })
            return true
        } catch (error) {
            console.error('Send Mail Error:', error)
            return false
        } finally {
            set({ isLoading: false })
        }
    },

    // 8. Send Mail By ID (Adapter for Component compatibility)
    sendMailById: async (id: string, uid: string) => {
        // We use the uid implementation as the primary logic
        // If your backend specifically needs the numeric ID, allow changing this
        return await get().sendMail(uid)
    },

    // 9. Fetch Details (Network)
    fetchMailDetails: async (uid: string) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(`${BASE_URL}/mail/${uid}`, {
                headers: getAuthHeaders(),
            })
            return response.data
        } catch (error) {
            console.error('Failed to fetch mail details:', error)
            return null
        } finally {
            set({ isLoading: false })
        }
    },

    // 10. Download Mail PDF (New)
    downloadMailPdf: async (uid: string) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/mail/${uid}/download`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                },
            )
            // Create a Blob URL
            const blob = new Blob([response.data], { type: 'application/pdf' })
            return window.URL.createObjectURL(blob)
        } catch (error) {
            console.error('Download PDF Error:', error)
            return null
        } finally {
            set({ isLoading: false })
        }
    },

    // 11. Download Receipt PDF (New)
    downloadReceiptPdf: async (uid: string) => {
        set({ isLoading: true })
        try {
            const response = await axios.get(
                `${BASE_URL}/perform/receipt/${uid}`,
                {
                    headers: getAuthHeaders(),
                    responseType: 'blob',
                },
            )
            const blob = new Blob([response.data], { type: 'application/pdf' })
            return window.URL.createObjectURL(blob)
        } catch (error) {
            console.error('Download Receipt Error:', error)
            return null
        } finally {
            set({ isLoading: false })
        }
    },
}))
