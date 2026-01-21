import { useState } from 'react'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Upload from '@/components/ui/Upload'
import { HiOutlineCloudUpload } from 'react-icons/hi'
import { Formik, Form, Field } from 'formik'
import { useTranslation } from 'react-i18next' // Assuming you use i18next

// If you don't use i18n yet, you can replace t('...') with strings
// type Option = { value: string; label: string }

const CreateRegistry = () => {
    const { t } = useTranslation()

    // Options for the Select dropdown
    const documentTypes = [
        {
            value: 'warning_letter',
            label: t('registry.types.warningLetter', 'Ogohlantirish xati'),
        },
        {
            value: 'claim',
            label: t('registry.types.claim', "Da'vo (Pretenziya)"),
        },
        {
            value: 'warning',
            label: t('registry.types.warning', 'Ogohlantirish'),
        },
        {
            value: 'invitation',
            label: t('registry.types.invitation', 'Taklifnoma'),
        },
        {
            value: 'talabnoma',
            label: t('registry.types.talabnoma', 'Talabnoma'),
        },
        {
            value: 'dismissal',
            label: t('registry.types.dismissal', "Ishdan bo'shatish"),
        },
        { value: 'tvs', label: t('registry.types.tvs', 'TVS') },
    ]

    return (
        <div className="w-full px-5 py-10 opacity-60 pointer-events-none grayscale-[0.3] select-none cursor-not-allowed">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                    {t('registry.notWorking', 'Xozircha ishlamayapti...')}
                </h1>
                <p className="text-gray-400 dark:text-gray-600 mt-1">
                    {t(
                        'registry.subtitle',
                        "Ommaviy hujjat yaratish uchun formani to'ldiring",
                    )}
                </p>
            </div>

            <Formik
                initialValues={{
                    docType: '',
                    description: '',
                    file: null,
                }}
                onSubmit={() => {}}
            >
                {({ values }) => (
                    <Form>
                        <FormContainer>
                            <div className="flex flex-col gap-6">
                                {/* Document Type Select */}
                                <FormItem
                                    label={t(
                                        'registry.docType',
                                        'Shablon turi',
                                    )}
                                >
                                    <Field name="docType">
                                        {({ field, form }: any) => (
                                            <Select
                                                field={field}
                                                form={form}
                                                options={documentTypes}
                                                placeholder={t(
                                                    'registry.selectType',
                                                    "Ro'yxatdan turni tanlang...",
                                                )}
                                                isDisabled={true}
                                            />
                                        )}
                                    </Field>
                                </FormItem>

                                {/* File Upload */}
                                <FormItem
                                    label={t(
                                        'registry.registryDoc',
                                        'Hujjat reyestri',
                                    )}
                                >
                                    <Upload
                                        draggable
                                        disabled
                                        className="cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex flex-col items-center justify-center py-8 opacity-50">
                                            <div className="mb-4 opacity-50 text-gray-300 text-5xl">
                                                <HiOutlineCloudUpload />
                                            </div>
                                            <div className="text-base font-medium text-gray-400">
                                                {t(
                                                    'registry.uploadUnavailable',
                                                    'Yuklash imkonsiz',
                                                )}
                                            </div>
                                            <div className="text-sm mt-2 text-gray-300">
                                                {t(
                                                    'registry.uploadHint',
                                                    'PDF, Word, Excel (maks 10MB)',
                                                )}
                                            </div>
                                        </div>
                                    </Upload>
                                </FormItem>

                                {/* Description / Comment */}
                                <FormItem
                                    label={t(
                                        'registry.comment',
                                        'Izoh / Tavsif',
                                    )}
                                >
                                    <Field
                                        type="text"
                                        name="description"
                                        placeholder={t(
                                            'registry.blocked',
                                            'Maydon bloklangan...',
                                        )}
                                        component={Input}
                                        textArea
                                        disabled
                                    />
                                </FormItem>

                                {/* Buttons */}
                                <div className="flex justify-end gap-4 mt-2">
                                    <Button
                                        size="lg"
                                        className="min-w-[120px]"
                                        disabled
                                        type="button"
                                    >
                                        {t('registry.cancel', 'Bekor qilish')}
                                    </Button>
                                    <Button
                                        variant="solid"
                                        size="lg"
                                        className="min-w-[160px]"
                                        disabled
                                        type="submit"
                                    >
                                        {t('registry.create', 'Yaratish')}
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
