import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineDocumentText,
    HiOutlineIdentification,
} from 'react-icons/hi'

import Table from '@/components/ui/Table'
const { Tr, Th, Td, THead, TBody } = Table

import Input from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import axios from 'axios'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// --- Helper Component: Status Tag ---
const StatusTag = ({ row }: { row: any }) => {
    if (!row.isSend) {
        return (
            <Tag className="bg-gray-100 text-gray-600 border-0 rounded-full">
                Qoralama
            </Tag>
        )
    }

    if (row.activePerformId != null && row.activePerform != null) {
        const performType = row.activePerform.performType
        let label = ''
        let className = ''

        switch (performType) {
            case 'SuccessDelivered':
                label = 'Yetkazib berildi'
                className =
                    'bg-emerald-100 text-emerald-600 border-0 rounded-full'
                break
            case 'ReceiverDead':
                label = 'Qabul qiluvchi vafot etgan'
                className = 'bg-red-100 text-red-600 border-0 rounded-full'
                break
            case 'ReceiverNotLivesThere':
            case 'IncompleteAddress':
                label =
                    performType === 'IncompleteAddress'
                        ? "Manzil to'liq emas"
                        : 'Bu manzilda yashamaydi'
                className = 'bg-amber-100 text-amber-600 border-0 rounded-full'
                break
            case 'ReceiverRefuse':
                label = 'Rad etildi'
                className = 'bg-red-100 text-red-600 border-0 rounded-full'
                break
            default:
                label = "Ma'lumot yo'q"
                className = 'bg-gray-100 text-gray-500 border-0 rounded-full'
        }
        return <Tag className={className}>{label}</Tag>
    }

    return (
        <Tag className="bg-blue-100 text-blue-600 border-0 rounded-full">
            Yuborilgan
        </Tag>
    )
}

const SentMails = () => {
    const navigate = useNavigate()

    // Store
    const { mails, isLoading, getAllMails } = useMailStore()
    const token = useAccountStore((state) => state.userProfile?.token)

    // --- State ---
    const [filterId, setFilterId] = useState('')
    const [filterName, setFilterName] = useState('')

    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)

    // --- PDF Modal State ---
    const [pdfModalOpen, setPdfModalOpen] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')
    const [pdfTitle, setPdfTitle] = useState('')
    const [isPdfLoading, setIsPdfLoading] = useState(false)

    // --- Helpers ---
    const getHeaders = () => {
        let authToken = token

        if (!authToken) {
            try {
                const localData = localStorage.getItem('account-storage')
                if (localData) {
                    const parsed = JSON.parse(localData)
                    authToken =
                        parsed?.state?.user?.token ||
                        parsed?.state?.userProfile?.token
                }
            } catch (error) {
                console.error('Error reading token from localStorage', error)
            }
        }

        return {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken}`,
            accept: '*/*',
        }
    }

    const formatDate = (date: Date | null) => {
        return date ? dayjs(date).format('YYYY-MM-DD') : undefined
    }

    // --- API Fetch ---
    const fetchData = async () => {
        await getAllMails({
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            isSend: true,
        })
    }

    // Watchers
    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    // --- Client-Side Filtering ---
    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            // 1. Filter by ID
            if (filterId) {
                const id = item.uid?.toLowerCase() || ''
                if (!id.includes(filterId.toLowerCase().trim())) {
                    return false
                }
            }

            // 2. Filter by Name (Receiver)
            if (filterName) {
                const name = item.receiverName?.toLowerCase() || ''
                if (!name.includes(filterName.toLowerCase().trim())) {
                    return false
                }
            }

            return true
        })
    }, [mails, filterId, filterName])

    // --- Actions ---
    const openPdfViewer = async (row: any) => {
        setPdfTitle(`Hujjat: ${row.uid} - ${row.receiverName}`)
        setPdfModalOpen(true)
        setIsPdfLoading(true)
        setPdfUrl('')

        try {
            const url = `${BASE_URL}/mail/${row.uid}/download`
            const response = await axios.get(url, {
                responseType: 'blob',
                headers: getHeaders(),
            })
            const blob = new Blob([response.data], { type: 'application/pdf' })
            setPdfUrl(window.URL.createObjectURL(blob))
        } catch (error) {
            toast.push(
                <Notification type="danger">
                    PDF yuklashda xatolik
                </Notification>,
            )
            setPdfModalOpen(false)
        } finally {
            setIsPdfLoading(false)
        }
    }

    return (
        <div className="p-4">
            {/* --- Filter Card --- */}
            <Card className="mb-4 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
                    <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
                        {/* Start Date */}
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Sana (dan)
                            </label>
                            <DatePicker
                                placeholder="Boshlanish"
                                value={startDate}
                                onChange={setStartDate}
                                size="sm"
                            />
                        </div>

                        {/* End Date */}
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Sana (gacha)
                            </label>
                            <DatePicker
                                placeholder="Tugash"
                                value={endDate}
                                onChange={setEndDate}
                                size="sm"
                            />
                        </div>

                        <div className="hidden lg:block h-8 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        {/* ID Input */}
                        <div className="w-full sm:w-40">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                ID raqam
                            </label>
                            <Input
                                placeholder="ID bo'yicha..."
                                prefix={
                                    <HiOutlineIdentification className="text-lg" />
                                }
                                value={filterId}
                                onChange={(e) => setFilterId(e.target.value)}
                                size="sm"
                            />
                        </div>

                        {/* Name Input */}
                        <div className="w-full sm:w-56">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                Qabul qiluvchi
                            </label>
                            <Input
                                placeholder="Ism bo'yicha qidirish..."
                                prefix={<HiOutlineSearch className="text-lg" />}
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                size="sm"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            variant="solid"
                            size="sm"
                            icon={<HiOutlinePlus />}
                            onClick={() => navigate('/mail/create-pdf')}
                        >
                            Yangi hujjat
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            icon={<HiOutlinePlus />}
                            onClick={() => navigate('/mail/create-registry')}
                        >
                            Yangi reestr
                        </Button>
                    </div>
                </div>
            </Card>

            {/* --- Data Table --- */}
            <Card className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
                            <Th>Fayl</Th>
                            <Th>ID</Th>
                            <Th>Qabul qiluvchi</Th>
                            <Th>Manzil</Th>
                            <Th>Sana</Th>
                            <Th>Holat</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {isLoading ? (
                            <Tr>
                                <Td colSpan={6} className="text-center py-10">
                                    <Spinner size="40px" />
                                </Td>
                            </Tr>
                        ) : filteredMails.length === 0 ? (
                            <Tr>
                                <Td
                                    colSpan={6}
                                    className="text-center py-6 text-gray-500"
                                >
                                    Ma'lumot topilmadi
                                </Td>
                            </Tr>
                        ) : (
                            filteredMails.map((row: any) => (
                                <Tr key={row.uid}>
                                    <Td className="w-[60px]">
                                        <Button
                                            shape="circle"
                                            variant="plain"
                                            size="sm"
                                            className="text-red-500 hover:bg-red-50"
                                            icon={
                                                <HiOutlineDocumentText className="text-xl" />
                                            }
                                            onClick={() => openPdfViewer(row)}
                                        />
                                    </Td>
                                    <Td className="font-mono text-gray-500 w-[120px]">
                                        {row.uid}
                                    </Td>
                                    {/* 👇 UPDATED: Navigate on Click */}
                                    <Td>
                                        <span
                                            className="font-medium text-blue-600 hover:underline cursor-pointer"
                                            onClick={() =>
                                                navigate(
                                                    `/mail/viewer/${row.uid}`,
                                                )
                                            }
                                        >
                                            {row.receiverName}
                                        </span>
                                    </Td>
                                    <Td>{row.receiverAddress}</Td>
                                    <Td>
                                        {dayjs(row.createdAt).format(
                                            'DD.MM.YYYY',
                                        )}
                                    </Td>
                                    <Td>
                                        <StatusTag row={row} />
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>
            </Card>

            {/* --- PDF Viewer Modal --- */}
            <Dialog
                isOpen={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                width={1000}
                contentClassName="p-0"
                closable
                title={pdfTitle}
            >
                <div className="h-[75vh] w-full bg-gray-100 flex items-center justify-center rounded-b-lg overflow-hidden">
                    {isPdfLoading ? (
                        <Spinner size="lg" />
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full"
                            frameBorder="0"
                        />
                    ) : (
                        <div className="text-gray-400">PDF topilmadi</div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}

export default SentMails
