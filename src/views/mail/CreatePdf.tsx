import { useState, useEffect } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import Card from '@/components/ui/Card'
import {
    HiOutlineCloudUpload,
    HiOutlineTrash,
    HiOutlineDocumentText,
} from 'react-icons/hi'
import { Formik, Form, Field, FieldProps } from 'formik'
import * as Yup from 'yup'
import axios from 'axios'
import { useMailStore } from '@/store/mailStore'
import { useAccountStore } from '@/store/accountStore'

// --- Types ---
type Option = {
    value: number
    label: string
}

// --- Validation Schema (Uzbek Messages) ---
const validationSchema = Yup.object().shape({
    recipient: Yup.string().required('Qabul qiluvchi kiritilishi shart'),
    address: Yup.string().required('Manzil kiritilishi shart'),
    region: Yup.number().required('Viloyat tanlanishi shart').nullable(),
    area: Yup.number().required('Tuman tanlanishi shart').nullable(),
    file: Yup.mixed().required('Fayl yuklanishi shart'),
})

const CreatePdf = () => {
    // Store
    const { createMail, isLoading } = useMailStore()
    const token = useAccountStore((state) => state.userProfile?.token)

    // Local Data State
    const [regions, setRegions] = useState<Option[]>([])
    const [areas, setAreas] = useState<Option[]>([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingAreas, setLoadingAreas] = useState(false)

    const BASE_URL =
        import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

    // Helper: Headers
    const getHeaders = () => {
        let authToken = token
        // Helper logic to grab token from localStorage if missing in state
        if (!authToken) {
            try {
                const local = localStorage.getItem('account-storage')
                if (local) {
                    const parsed = JSON.parse(local)
                    authToken =
                        parsed?.state?.user?.token ||
                        parsed?.state?.userProfile?.token
                }
            } catch (e) {
                console.error(e)
            }
        }
        return {
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${authToken}`,
            accept: '*/*',
        }
    }

    // 1. Fetch Regions
    useEffect(() => {
        const fetchRegions = async () => {
            setLoadingRegions(true)
            try {
                const response = await axios.get(`${BASE_URL}/region`, {
                    headers: getHeaders(),
                })
                if (response.data?.code === 200) {
                    const options = response.data.data.map((r: any) => ({
                        value: r.id,
                        label: r.name,
                    }))
                    setRegions(options)
                }
            } catch (error) {
                console.error('Viloyatlarni yuklashda xatolik', error)
            } finally {
                setLoadingRegions(false)
            }
        }
        fetchRegions()
    }, [])

    // 2. Fetch Areas
    const fetchAreas = async (regionId: number) => {
        setLoadingAreas(true)
        try {
            const response = await axios.get(
                `${BASE_URL}/region/${regionId}/areas`,
                { headers: getHeaders() },
            )
            if (response.data?.code === 200) {
                const options = response.data.data.areas.map((a: any) => ({
                    value: a.id,
                    label: a.name,
                }))
                setAreas(options)
            } else {
                setAreas([])
            }
        } catch (error) {
            console.error('Tumanlarni yuklashda xatolik', error)
            setAreas([])
        } finally {
            setLoadingAreas(false)
        }
    }

    // 3. Submit Handler
    const handleSubmit = async (values: any, { resetForm }: any) => {
        const formData = new FormData()
        formData.append('ReceiverName', values.recipient)
        formData.append('ReceiverAddress', values.address)
        formData.append('PagesCount', '1')
        formData.append('RegionId', values.region?.toString() || '')
        formData.append('AreaId', values.area?.toString() || '')
        formData.append('BranchId', '')
        formData.append('OrganizationId', '')
        formData.append('PdfFile', values.file)

        const success = await createMail(formData)

        if (success) {
            toast.push(
                <Notification title="Muvaffaqiyatli" type="success">
                    Hujjat muvaffaqiyatli yaratildi!
                </Notification>,
            )
            resetForm()
            setAreas([])
        } else {
            toast.push(
                <Notification title="Xatolik" type="danger">
                    Hujjat yaratishda xatolik yuz berdi.
                </Notification>,
            )
        }
    }

    // --- Styling Constants ---
    const inputClass =
        '!border !border-gray-300 focus:!border-indigo-500 !bg-white dark:!bg-gray-800 dark:!border-gray-600 rounded-lg h-11'

    return (
        <div className="flex justify-center w-full p-4">
            <div className="w-full max-w-full">
                {/* Header Section */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        PDF fayldan hujjat yaratish
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Fayldan hujjat yaratish uchun quyidagi formani
                        to'ldiring
                    </p>
                </div>

                {/* Form Card */}
                <Card className="shadow-sm border border-gray-200 dark:border-gray-700 rounded-2xl">
                    <Formik
                        initialValues={{
                            recipient: '',
                            address: '',
                            region: null,
                            area: null,
                            file: null,
                        }}
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                    >
                        {({ values, setFieldValue, errors, touched }) => (
                            <Form>
                                <FormContainer>
                                    <div className="flex flex-col gap-6 p-2">
                                        {/* Recipient Input */}
                                        <FormItem
                                            label={
                                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                    Qabul qiluvchi
                                                </span>
                                            }
                                            invalid={
                                                errors.recipient &&
                                                touched.recipient
                                            }
                                            errorMessage={
                                                errors.recipient as string
                                            }
                                        >
                                            <Field name="recipient">
                                                {({ field }: FieldProps) => (
                                                    <Input
                                                        {...field}
                                                        type="text"
                                                        placeholder="To'liq ism yoki tashkilot nomini kiriting"
                                                        className={inputClass}
                                                    />
                                                )}
                                            </Field>
                                        </FormItem>

                                        {/* Address Input */}
                                        <FormItem
                                            label={
                                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                    Manzil
                                                </span>
                                            }
                                            invalid={
                                                errors.address &&
                                                touched.address
                                            }
                                            errorMessage={
                                                errors.address as string
                                            }
                                        >
                                            <Field name="address">
                                                {({ field }: FieldProps) => (
                                                    <Input
                                                        {...field}
                                                        type="text"
                                                        placeholder="To'liq manzil (Ko'cha, Uy va h.k.)"
                                                        className={inputClass}
                                                    />
                                                )}
                                            </Field>
                                        </FormItem>

                                        {/* Region & District Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormItem
                                                label={
                                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                        Viloyat
                                                    </span>
                                                }
                                                invalid={
                                                    errors.region &&
                                                    touched.region
                                                }
                                                errorMessage={
                                                    errors.region as string
                                                }
                                            >
                                                <Select
                                                    options={regions}
                                                    placeholder="Viloyatni tanlang"
                                                    isLoading={loadingRegions}
                                                    value={regions.find(
                                                        (r) =>
                                                            r.value ===
                                                            values.region,
                                                    )}
                                                    className="shadow-sm"
                                                    onChange={(option: any) => {
                                                        setFieldValue(
                                                            'region',
                                                            option?.value ||
                                                                null,
                                                        )
                                                        setFieldValue(
                                                            'area',
                                                            null,
                                                        )
                                                        if (option?.value)
                                                            fetchAreas(
                                                                option.value,
                                                            )
                                                        else setAreas([])
                                                    }}
                                                />
                                            </FormItem>

                                            <FormItem
                                                label={
                                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                        Tuman
                                                    </span>
                                                }
                                                invalid={
                                                    errors.area && touched.area
                                                }
                                                errorMessage={
                                                    errors.area as string
                                                }
                                            >
                                                <Select
                                                    options={areas}
                                                    placeholder="Tumanni tanlang"
                                                    isLoading={loadingAreas}
                                                    isDisabled={!values.region}
                                                    value={areas.find(
                                                        (a) =>
                                                            a.value ===
                                                            values.area,
                                                    )}
                                                    className="shadow-sm"
                                                    onChange={(option: any) => {
                                                        setFieldValue(
                                                            'area',
                                                            option?.value ||
                                                                null,
                                                        )
                                                    }}
                                                />
                                            </FormItem>
                                        </div>

                                        {/* File Upload Area */}
                                        <FormItem
                                            label={
                                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                    Hujjat yuklash
                                                </span>
                                            }
                                            invalid={
                                                errors.file && touched.file
                                            }
                                            errorMessage={errors.file as string}
                                        >
                                            <Upload
                                                draggable
                                                accept=".pdf"
                                                showList={false}
                                                className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all rounded-xl p-8"
                                                onChange={(files) => {
                                                    if (
                                                        files &&
                                                        files.length > 0
                                                    ) {
                                                        setFieldValue(
                                                            'file',
                                                            files[0],
                                                        )
                                                    } else {
                                                        setFieldValue(
                                                            'file',
                                                            null,
                                                        )
                                                    }
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center">
                                                    {!values.file ? (
                                                        <>
                                                            <div className="mb-4 text-indigo-500 text-5xl bg-indigo-100 p-4 rounded-full">
                                                                <HiOutlineCloudUpload />
                                                            </div>
                                                            <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                                                Faylni tanlash
                                                                yoki shu yerga
                                                                tashlash
                                                            </div>
                                                            <div className="text-sm mt-2 text-gray-400">
                                                                Faqat PDF (maks.
                                                                10MB)
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center animate-fade-in">
                                                            <div className="mb-4 text-red-500 text-6xl">
                                                                <HiOutlineDocumentText />
                                                            </div>
                                                            <div className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                                                                {
                                                                    (
                                                                        values.file as File
                                                                    ).name
                                                                }
                                                            </div>
                                                            <div className="text-xs text-gray-400 mb-4">
                                                                {(
                                                                    (
                                                                        values.file as File
                                                                    ).size /
                                                                    1024 /
                                                                    1024
                                                                ).toFixed(
                                                                    2,
                                                                )}{' '}
                                                                MB
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="solid"
                                                                color="red-500"
                                                                icon={
                                                                    <HiOutlineTrash />
                                                                }
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation()
                                                                    setFieldValue(
                                                                        'file',
                                                                        null,
                                                                    )
                                                                }}
                                                            >
                                                                Faylni o'chirish
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Upload>
                                        </FormItem>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <Button
                                                size="md"
                                                className="min-w-[120px]"
                                                type="button"
                                                onClick={() => resetForm()}
                                            >
                                                Bekor qilish
                                            </Button>
                                            <Button
                                                variant="solid"
                                                size="md"
                                                className="min-w-[150px] bg-indigo-600 hover:bg-indigo-700"
                                                type="submit"
                                                loading={isLoading}
                                            >
                                                Yaratish
                                            </Button>
                                        </div>
                                    </div>
                                </FormContainer>
                            </Form>
                        )}
                    </Formik>
                </Card>
            </div>
        </div>
    )
}

export default CreatePdf
