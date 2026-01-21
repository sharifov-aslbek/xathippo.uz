import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom' // 👈 Import these
import { useMailStore } from '@/store/mailStore'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Loading from '@/components/shared/Loading'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { HiDownload, HiPencil, HiXCircle } from 'react-icons/hi'

// API Base URL
const BASE_URL =
    import.meta.env.VITE_BASE_URL || 'https://default-api.example.com/api'

// Helper to get token
const getToken = () => {
    let token = ''
    try {
        const storageData = localStorage.getItem('account-storage')
        if (storageData) {
            const parsedData = JSON.parse(storageData)
            token = parsedData?.state?.user?.token || ''
        }
    } catch (error) {
        console.error(error)
    }
    return token
}

const MailDetails = () => {
    // 1. CAPTURE DATA FROM URL
    const { id } = useParams() // 👈 Gets "16"
    const [searchParams] = useSearchParams()
    const uid = searchParams.get('uid') || id

    const navigate = useNavigate()

    // Store
    const { fetchMailDetails } = useMailStore()

    // Local State
    const [mail, setMail] = useState<any>(null)
    const [detailsLoading, setDetailsLoading] = useState(true)

    // PDF State
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [pdfLoading, setPdfLoading] = useState(true)

    // Receipt Modal State
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null)
    const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)

    // --- Helpers ---
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'mavjud emas'
        return new Date(dateStr).toLocaleString('uz-UZ')
    }

    // --- Fetching ---
    useEffect(() => {
        const loadData = async () => {
            // Check if we have UID (We prioritize UID for fetching details)
            if (!uid) {
                setDetailsLoading(false)
                return
            }

            // 1. Fetch Details using UID (TD16)
            const data = await fetchMailDetails(uid)
            if (data) setMail(data)
            setDetailsLoading(false)

            // 2. Fetch PDF Blob
            setPdfLoading(true)
            try {
                const token = getToken()
                const response = await fetch(
                    `${BASE_URL}/mail/${uid}/download`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'ngrok-skip-browser-warning': 'true',
                        },
                    },
                )
                if (!response.ok) throw new Error('PDF Load Failed')

                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                setPdfUrl(url)
            } catch (error) {
                console.error(error)
                // Optional: Toast error here
            } finally {
                setPdfLoading(false)
            }
        }

        loadData()

        // Cleanup blobs on unmount
        return () => {
            if (pdfUrl) window.URL.revokeObjectURL(pdfUrl)
            if (receiptPdfUrl) window.URL.revokeObjectURL(receiptPdfUrl)
        }
        // eslint-disable-next-line
    }, [uid])

    // --- Handlers ---

    const handleDownloadReceipt = async () => {
        if (!mail) return
        setIsDownloadingReceipt(true)
        try {
            const token = getToken()
            const response = await fetch(
                `${BASE_URL}/perform/receipt/${mail.uid}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                },
            )
            if (!response.ok) throw new Error('Receipt Download Failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            // 1. Auto Download
            const link = document.createElement('a')
            link.href = url
            link.download = `${mail.uid}_receipt.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // 2. Show in Modal
            setReceiptPdfUrl(url)
            setShowReceiptModal(true)

            toast.push(
                <Notification type="success" title="Muvaffaqiyatli">
                    Kvitansiya yuklandi
                </Notification>,
            )
        } catch (error) {
            toast.push(
                <Notification type="danger" title="Xatolik">
                    Kvitansiyani yuklab bo'lmadi
                </Notification>,
            )
        } finally {
            setIsDownloadingReceipt(false)
        }
    }

    // --- Render Helpers ---
    const renderPerformStatus = (perform: any) => {
        if (!perform)
            return (
                <Tag className="bg-orange-100 text-orange-600 border-0">
                    Mavjud emas
                </Tag>
            )
        const type = perform.PerformType
        switch (type) {
            case 'SuccessDelivered':
                return (
                    <Tag className="bg-green-100 text-green-600 border-0">
                        Muvaffaqiyatli yetkazildi
                    </Tag>
                )
            case 'ReceiverDead':
                return (
                    <Tag className="bg-red-100 text-red-600 border-0">
                        Qabul qiluvchi vafot etgan
                    </Tag>
                )
            case 'ReceiverNotLivesThere':
                return (
                    <Tag className="bg-yellow-100 text-yellow-600 border-0">
                        Bu yerda yashamaydi
                    </Tag>
                )
            case 'IncompleteAddress':
                return (
                    <Tag className="bg-yellow-100 text-yellow-600 border-0">
                        Manzil to'liq emas
                    </Tag>
                )
            case 'ReceiverRefuse':
                return (
                    <Tag className="bg-red-100 text-red-600 border-0">
                        Rad etdi
                    </Tag>
                )
            case 'NotAtHome':
                return (
                    <Tag className="bg-gray-100 text-gray-600 border-0">
                        Uyda yo'q
                    </Tag>
                )
            case 'DidntAppearOnNotice':
                return (
                    <Tag className="bg-gray-100 text-gray-600 border-0">
                        Kelilmadi
                    </Tag>
                )
            default:
                return (
                    <Tag className="bg-orange-100 text-orange-600 border-0">
                        Noma'lum
                    </Tag>
                )
        }
    }

    if (detailsLoading) return <Loading loading={true} />
    if (!mail) return <div className="p-4 text-center">Ma'lumot topilmadi</div>

    return (
        <div className="h-full">
            {/* --- TOP CARD: DETAILS --- */}
            <Card className="mb-6" bodyClass="p-6">
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
                    {mail.uid}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Data Fields */}
                    <div>
                        <div className="text-gray-500 font-medium mb-1">
                            Qabul qiluvchi:
                        </div>
                        <div className="font-bold text-gray-800 dark:text-gray-100">
                            {mail.receiverName}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 font-medium mb-1">
                            Yaratilgan sana:
                        </div>
                        <div className="text-gray-800 dark:text-gray-100">
                            {formatDate(mail.createdAt)}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-gray-500 font-medium mb-1">
                            Manzil:
                        </div>
                        <div className="text-gray-800 dark:text-gray-100">
                            {mail.receiverAddress}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 font-medium mb-1">
                            Viloyat:
                        </div>
                        <div className="text-gray-800 dark:text-gray-100">
                            {mail.regionName || "Ko'rsatilmagan"}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 font-medium mb-1">
                            Tuman:
                        </div>
                        <div className="text-gray-800 dark:text-gray-100">
                            {mail.areaName || "Ko'rsatilmagan"}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 font-medium mb-1">
                            Holat:
                        </div>
                        {!mail.isSend ? (
                            <Tag className="bg-orange-100 text-orange-600 border-0">
                                Yuborilmagan
                            </Tag>
                        ) : (
                            renderPerformStatus(mail.ActivePerform)
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

                <div className="flex justify-end gap-3">
                    {mail.isSend ? (
                        <Button
                            variant="solid"
                            color="blue-600"
                            loading={isDownloadingReceipt}
                            onClick={handleDownloadReceipt}
                            icon={<HiDownload />}
                        >
                            Kvitansiyani yuklash
                        </Button>
                    ) : (
                        <Button
                            variant="solid"
                            // 3. NAVIGATE TO EDIT PAGE (Using the ID and UID)
                            onClick={() =>
                                navigate(
                                    `/mail/edit/${mail.uid.slice(2)}?uid=${mail.uid}`,
                                )
                            }
                            icon={<HiPencil />}
                        >
                            Tahrirlash
                        </Button>
                    )}
                </div>
            </Card>

            {/* --- BOTTOM CARD: PDF PREVIEW --- */}
            <Card
                className={`relative min-h-[500px] ${pdfLoading ? 'opacity-70' : ''}`}
            >
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                    Hujjat
                </h2>
                {pdfLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loading loading={true} />
                    </div>
                )}
                <div className="h-[80vh] w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden relative border dark:border-gray-700">
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full"
                            title="PDF Preview"
                        />
                    ) : (
                        !pdfLoading && (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                PDF yuklab bo'lmadi
                            </div>
                        )
                    )}
                </div>
            </Card>

            {/* --- RECEIPT MODAL --- */}
            <Dialog
                isOpen={showReceiptModal}
                onClose={() => setShowReceiptModal(false)}
                onRequestClose={() => setShowReceiptModal(false)}
                width={800}
                height="90vh"
            >
                <div className="flex flex-col h-full p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Kvitansiya</h3>
                        <Button
                            size="sm"
                            onClick={() => setShowReceiptModal(false)}
                            icon={<HiXCircle />}
                        >
                            Yopish
                        </Button>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded overflow-hidden border">
                        {receiptPdfUrl && (
                            <iframe
                                src={receiptPdfUrl}
                                className="w-full h-full"
                                title="Receipt"
                            />
                        )}
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default MailDetails
