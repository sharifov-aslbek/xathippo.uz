import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlinePlus,
    HiOutlineDocumentText,
} from 'react-icons/hi'

import Table from '@/components/ui/Table'
const { Tr, Th, Td, THead, TBody } = Table

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
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

// --- Types ---
type Option = { value: string | number; label: string }

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

const MailList = () => {
    const navigate = useNavigate()

    // Stores
    const { mails, isLoading, getAllMails, sendMail } = useMailStore()
    const token = useAccountStore((state) => state.userProfile?.token)

    // --- Filter States ---
    const [filterStatus, setFilterStatus] = useState<Option | null>(null)
    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
    const [filterRegion, setFilterRegion] = useState<Option | null>(null)
    const [filterArea, setFilterArea] = useState<Option | null>(null)

    const [filterSender, setFilterSender] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // --- Data Options States ---
    const [regionOptions, setRegionOptions] = useState<Option[]>([])
    const [areaOptions, setAreaOptions] = useState<Option[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)

    // --- Modal States ---
    const [pdfModalOpen, setPdfModalOpen] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')
    const [pdfTitle, setPdfTitle] = useState('')
    const [isPdfLoading, setIsPdfLoading] = useState(false)

    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [mailToSend, setMailToSend] = useState<any>(null)
    const [isSending, setIsSending] = useState(false)

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

    // --- 1. Fetch Filter Options ---
    useEffect(() => {
        const fetchRegions = async () => {
            setLoadingRegions(true)
            try {
                const response = await axios.get(`${BASE_URL}/region`, {
                    headers: getHeaders(),
                })
                if (response.data?.code === 200) {
                    setRegionOptions(
                        response.data.data.map((r: any) => ({
                            value: r.id,
                            label: r.name,
                        })),
                    )
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingRegions(false)
            }
        }
        fetchRegions()
    }, [])

    const handleRegionChange = async (option: Option | null) => {
        setFilterRegion(option)
        setFilterArea(null)
        setAreaOptions([])

        if (option?.value) {
            setLoadingAreas(true)
            try {
                const response = await axios.get(
                    `${BASE_URL}/region/${option.value}/areas`,
                    { headers: getHeaders() },
                )
                if (response.data?.code === 200) {
                    setAreaOptions(
                        response.data.data.areas.map((a: any) => ({
                            value: a.id,
                            label: a.name,
                        })),
                    )
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingAreas(false)
            }
        }
    }

    // --- 2. Main Data Fetch ---
    const fetchData = async () => {
        let isSend: boolean | undefined
        if (filterStatus?.value === 'sent') isSend = true
        if (filterStatus?.value === 'draft') isSend = false

        await getAllMails({
            startDate: formatDate(filterStartDate),
            endDate: formatDate(filterEndDate),
            isSend,
            regionId: filterRegion?.value,
            areaId: filterArea?.value,
        })
    }

    useEffect(() => {
        fetchData()
    }, [filterStatus, filterStartDate, filterEndDate, filterRegion, filterArea])

    // --- 3. Client-Side Filtering ---
    const filteredMails = useMemo(() => {
        if (!mails) return []
        return mails.filter((item: any) => {
            if (
                filterSender &&
                !item.receiverName
                    .toLowerCase()
                    .includes(filterSender.toLowerCase())
            ) {
                return false
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase().trim()
                const id = item.uid?.toLowerCase() || ''
                if (!id.includes(query)) {
                    return false
                }
            }
            return true
        })
    }, [mails, filterSender, searchQuery])

    // --- 4. Actions ---
    const openPdfViewer = async (row: any) => {
        setPdfTitle(`Hujjat: ${row.uid} - ${row.receiverName}`)
        setPdfModalOpen(true)
        setIsPdfLoading(true)
        setPdfUrl('')

        try {
            const response = await axios.get(
                `${BASE_URL}/mail/${row.uid}/download`,
                {
                    responseType: 'blob',
                    headers: getHeaders(),
                },
            )
            const blob = new Blob([response.data], { type: 'application/pdf' })
            setPdfUrl(window.URL.createObjectURL(blob))
        } catch (error) {
            console.error(error)
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

    const confirmSend = async () => {
        if (!mailToSend) return
        setIsSending(true)
        try {
            const success = await sendMail(mailToSend.uid)
            if (success) {
                toast.push(
                    <Notification type="success">
                        Muvaffaqiyatli yuborildi
                    </Notification>,
                )
                setSendModalOpen(false)
                fetchData()
            } else {
                toast.push(
                    <Notification type="danger">
                        Yuborishda xatolik
                    </Notification>,
                )
            }
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="p-4">
            {/* --- Filters Card --- */}
            <Card className="mb-6 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Status */}
                    <div className="lg:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Holat
                        </label>
                        <Select
                            placeholder="Holat"
                            options={[
                                {
                                    label: 'Barchasi',
                                    value: 'all',
                                },
                                {
                                    label: 'Yuborilgan',
                                    value: 'sent',
                                },
                                {
                                    label: 'Qoralama',
                                    value: 'draft',
                                },
                            ]}
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val)}
                            size="sm"
                        />
                    </div>

                    {/* Start Date */}
                    <div className="lg:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Sana (dan)
                        </label>
                        <DatePicker
                            placeholder="Boshlanish sanasi"
                            value={filterStartDate}
                            onChange={setFilterStartDate}
                            size="sm"
                        />
                    </div>

                    {/* End Date */}
                    <div className="lg:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Sana (gacha)
                        </label>
                        <DatePicker
                            placeholder="Tugash sanasi"
                            value={filterEndDate}
                            onChange={setFilterEndDate}
                            size="sm"
                        />
                    </div>

                    {/* Region */}
                    <div className="lg:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Viloyat
                        </label>
                        <Select
                            placeholder="Viloyatni tanlang"
                            options={regionOptions}
                            isLoading={loadingRegions}
                            value={filterRegion}
                            onChange={handleRegionChange}
                            size="sm"
                        />
                    </div>

                    {/* District */}
                    <div className="lg:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Tuman
                        </label>
                        <Select
                            placeholder="Tumanni tanlang"
                            options={areaOptions}
                            isLoading={loadingAreas}
                            isDisabled={!filterRegion}
                            value={filterArea}
                            onChange={setFilterArea}
                            size="sm"
                        />
                    </div>

                    <div className="hidden lg:block lg:col-span-1"></div>

                    {/* Receiver Filter */}
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            Qabul qiluvchi
                        </label>
                        <Input
                            placeholder="Qabul qiluvchi bo'yicha"
                            prefix={<HiOutlineFilter className="text-lg" />}
                            value={filterSender}
                            onChange={(e) => setFilterSender(e.target.value)}
                            size="sm"
                        />
                    </div>

                    {/* ID Search */}
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                            ID Qidirish
                        </label>
                        <Input
                            placeholder="ID bo'yicha qidirish (m-n: TD10)..."
                            prefix={<HiOutlineSearch className="text-lg" />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="sm"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="lg:col-span-2 flex items-end gap-2 justify-end mt-2 lg:mt-0">
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
                                    {/* 👇 UPDATED: Uses row.uid in the path only */}
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
                                        <div className="flex items-center gap-2">
                                            <StatusTag row={row} />
                                        </div>
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

            {/* --- Send Confirmation Modal --- */}
            <Dialog
                isOpen={sendModalOpen}
                onClose={() => setSendModalOpen(false)}
                title="Yuborishni tasdiqlang"
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="text-xs text-gray-500 mb-1 uppercase font-bold">
                            E-Imzo
                        </div>
                        <Select isDisabled placeholder="Kalitni tanlang" />
                    </div>
                    <Button
                        variant="solid"
                        block
                        loading={isSending}
                        onClick={confirmSend}
                    >
                        Imzosiz yuborish
                    </Button>
                </div>
            </Dialog>
        </div>
    )
}

export default MailList
