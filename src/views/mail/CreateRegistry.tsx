import { useState, useEffect } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { HiOutlineCloudUpload } from 'react-icons/hi'
import { Formik, Form, Field } from 'formik'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import axios from 'axios'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useNavigate } from 'react-router-dom'

// --- Stores ---
import { useTemplateStore } from '@/store/templateStore'
import { useAccountStore } from '@/store/accountStore'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://tezdoc.kcloud.uz/api'

// --- HELPER: Convert Excel Serial Date ---
const formatExcelDate = (serial: number | string) => {
    if (typeof serial === 'string') return serial
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const y = date.getFullYear()
    return `${d}.${m}.${y}`
}

const CreateRegistry = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()

    // --- Stores ---
    const {
        templates,
        getTemplates,
        isLoading: isTemplatesLoading,
    } = useTemplateStore()
    const token = useAccountStore((state) => state.user?.token)

    // --- Local State ---
    const [excelData, setExcelData] = useState<any[]>([])
    const [validationErrors, setValidationErrors] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // --- 1. Fetch Templates on Mount ---
    useEffect(() => {
        getTemplates()
    }, [])

    // Prepare options for Select
    const templateOptions = templates.map((t) => ({
        value: t.name, // The API expects the Name string
        label: t.name,
    }))

    // --- 2. Validation Logic ---
    const validateExcelData = (data: any[]) => {
        const errors: string[] = []
        // Required columns in Excel
        const requiredFields = ['receiver', 'address', 'region', 'area']

        data.forEach((row, index) => {
            const rowNumber = index + 2 // +2 because Excel starts at 1 and header is 1
            if (row.receiver === 'Получатель' || row.receiver === 'Receiver')
                return

            if (!row.receiver) {
                errors.push(`Qator ${rowNumber}: "receiver" ustuni bo'sh`)
            }

            const missingCols = requiredFields.filter((field) => !row[field])
            if (missingCols.length > 0) {
                errors.push(
                    `Qator ${rowNumber}: To'ldirilmagan ustunlar: ${missingCols.join(', ')}`,
                )
            }
        })
        return errors
    }

    // --- 3. Data Transformation ---
    const transformDataToApiFormat = (rawData: any[], templateName: string) => {
        const cleanRows = rawData.filter(
            (row) =>
                row.receiver !== 'Получатель' && row.receiver !== 'Receiver',
        )

        return cleanRows.map((row) => {
            // Destructure known columns
            const { receiver, address, region, area, ...rest } = row

            // Process "rest" columns for Content JSON
            const contentObj: any = {}
            Object.keys(rest).forEach((key) => {
                let value = rest[key]
                // Handle Excel dates if needed
                const dateKeys = [
                    'document_date',
                    'print_date',
                    'date_of_deposit',
                ]
                if (dateKeys.includes(key) && typeof value === 'number') {
                    value = formatExcelDate(value)
                }
                contentObj[key] = String(value)
            })

            // Return exact shape for /queue-mails endpoint
            return {
                receiver: String(receiver),
                regionId: Number(region) || 0, // excel 'region' -> api 'regionId'
                areaId: Number(area) || 0, // excel 'area' -> api 'areaId'
                address: String(address),
                content: JSON.stringify(contentObj), // The rest as JSON string
                templateName: templateName, // From dropdown
            }
        })
    }

    // --- 4. File Upload Handler ---
    const handleFileUpload = (files: File[], form: any) => {
        setValidationErrors([])
        setExcelData([])

        if (files && files.length > 0) {
            const file = files[0]
            form.setFieldValue('file', file)

            const reader = new FileReader()
            reader.onload = (e) => {
                const data = e.target?.result
                if (data) {
                    const workbook = XLSX.read(data, { type: 'binary' })
                    const sheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet)

                    const errors = validateExcelData(jsonData)

                    if (errors.length > 0) {
                        setValidationErrors(errors)
                    } else {
                        // Just save raw data here, we transform on submit to get latest templateName
                        setExcelData(jsonData)
                    }
                }
            }
            reader.readAsBinaryString(file)
        }
    }

    // --- 5. API Submit Handler ---
    const handleSubmit = async (values: any) => {
        if (validationErrors.length > 0) return
        if (excelData.length === 0) {
            toast.push(
                <Notification type="warning">
                    Excel fayl ma'lumotlari bo'sh
                </Notification>,
            )
            return
        }

        setIsSubmitting(true)

        // Transform data right before sending to capture the selected template
        const payloadMails = transformDataToApiFormat(
            excelData,
            values.templateName,
        )

        const payload = {
            mails: payloadMails,
        }

        try {
            console.log('🚀 Sending Payload:', payload)

            const response = await axios.post(
                `${BASE_URL}/registry/queue-mails`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                        'Content-Type': 'application/json',
                    },
                },
            )

            if (response.status === 200 || response.status === 201) {
                toast.push(
                    <Notification type="success">
                        {payloadMails.length} ta xat navbatga qo'shildi!
                    </Notification>,
                )
                // Optional: navigate to the list page
                navigate('/mail/draftmails')
            }
        } catch (error: any) {
            console.error('API Error:', error)
            const errorMsg =
                error.response?.data?.message || 'Xatolik yuz berdi'
            toast.push(
                <Notification type="danger">Xatolik: {errorMsg}</Notification>,
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full px-5 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {t('registry.title', 'Hujjat Reyestri Yaratish')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Ommaviy hujjat yaratish uchun formani to'ldiring
                </p>
            </div>

            <Formik
                initialValues={{
                    templateName: '',
                    description: '',
                    file: null,
                }}
                onSubmit={handleSubmit}
            >
                {({ values, setFieldValue }) => (
                    <Form>
                        <FormContainer>
                            <div className="flex flex-col gap-6">
                                {/* Template Select */}
                                <FormItem
                                    label="Shablon turi"
                                    invalid={
                                        !values.templateName && isSubmitting
                                    }
                                    errorMessage="Shablon tanlash shart"
                                >
                                    <Field name="templateName">
                                        {({ field, form }: any) => (
                                            <Select
                                                field={field}
                                                form={form}
                                                options={templateOptions}
                                                isLoading={isTemplatesLoading}
                                                placeholder={
                                                    isTemplatesLoading
                                                        ? 'Yuklanmoqda...'
                                                        : 'Shablonni tanlang...'
                                                }
                                                value={templateOptions.find(
                                                    (opt) =>
                                                        opt.value ===
                                                        values.templateName,
                                                )}
                                                onChange={(option: any) =>
                                                    form.setFieldValue(
                                                        field.name,
                                                        option?.value,
                                                    )
                                                }
                                            />
                                        )}
                                    </Field>
                                </FormItem>

                                {/* File Upload */}
                                <FormItem
                                    label="Hujjat reyestri (Excel)"
                                    invalid={!values.file && isSubmitting}
                                    errorMessage="Fayl yuklash shart"
                                >
                                    <Field name="file">
                                        {({ form }: any) => (
                                            <Upload
                                                draggable
                                                className="cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                onChange={(files) =>
                                                    handleFileUpload(
                                                        files,
                                                        form,
                                                    )
                                                }
                                            >
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <div className="mb-4 text-indigo-500 text-5xl">
                                                        <HiOutlineCloudUpload />
                                                    </div>
                                                    <div className="text-base font-medium text-gray-600 dark:text-gray-300">
                                                        {values.file ? (
                                                            <span className="text-emerald-500 font-bold">
                                                                {
                                                                    values.file
                                                                        .name
                                                                }{' '}
                                                                yuklandi
                                                            </span>
                                                        ) : (
                                                            'Faylni shu yerga tashlang yoki yuklang'
                                                        )}
                                                    </div>
                                                    <div className="text-sm mt-2 text-gray-400">
                                                        Excel (.xlsx, .xls)
                                                    </div>
                                                </div>
                                            </Upload>
                                        )}
                                    </Field>
                                </FormItem>

                                {/* Validation Errors Alert */}
                                {validationErrors.length > 0 && (
                                    <Alert
                                        showIcon
                                        className="mb-4"
                                        type="danger"
                                        title="Faylda xatoliklar mavjud"
                                    >
                                        <div className="mt-2 max-h-40 overflow-y-auto pl-2 text-sm">
                                            <ul className="list-disc space-y-1">
                                                {validationErrors.map(
                                                    (err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    </Alert>
                                )}

                                {/*/!* Description (Optional) *!/*/}
                                {/*<FormItem label="Izoh / Tavsif">*/}
                                {/*    <Field*/}
                                {/*        type="text"*/}
                                {/*        name="description"*/}
                                {/*        placeholder="Izoh kiritishingiz mumkin..."*/}
                                {/*        component={Input}*/}
                                {/*        textArea*/}
                                {/*    />*/}
                                {/*</FormItem>*/}

                                {/* Actions */}
                                <div className="flex justify-end gap-4 mt-2">
                                    <Button
                                        size="lg"
                                        className="min-w-[120px]"
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => navigate(-1)}
                                    >
                                        Bekor qilish
                                    </Button>
                                    <Button
                                        variant="solid"
                                        size="lg"
                                        className="min-w-[160px]"
                                        type="submit"
                                        loading={isSubmitting}
                                        disabled={
                                            validationErrors.length > 0 ||
                                            !values.file ||
                                            !values.templateName
                                        }
                                    >
                                        Yaratish
                                    </Button>
                                </div>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default CreateRegistry
