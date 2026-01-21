import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import Alert from '@/components/ui/Alert'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ZodType } from 'zod'
import type { CommonProps } from '@/@types/common'
import { HiUser, HiOfficeBuilding, HiArrowLeft } from 'react-icons/hi'
import { useAccountStore } from '@/store/accountStore' // IMPORT YOUR STORE

interface SignUpFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
    setParentStep?: (step: string) => void
}

// --- Zod Schema for the FINAL step ---
type FinalStepSchema = {
    phone: string
    password: string
    confirmPassword: string
}

const finalStepSchema: ZodType<FinalStepSchema> = z
    .object({
        phone: z.string().min(1, 'Phone is required'),
        password: z.string().min(1, 'Password Required'),
        confirmPassword: z.string().min(1, 'Confirm Password Required'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

// --- Types ---
type Role = 'citizen' | 'director' | null
type Step = 'selection' | 'verification' | 'account'

const SignUpForm = (props: SignUpFormProps) => {
    const { disableSubmit = false, className, setMessage } = props
    const navigate = useNavigate()

    // --- Store Hooks ---
    const {
        getPersonByPinfl,
        getCompanyByInn,
        registerUser,
        registerDirector,
    } = useAccountStore()

    // --- State Machine ---
    const [currentStep, setCurrentStep] = useState<Step>('selection')
    const [role, setRole] = useState<Role>(null)
    const [isLoading, setIsLoading] = useState(false) // Local loading for search buttons

    // --- Data Models ---
    const [citizenData, setCitizenData] = useState({
        pinfl: '',
        fullName: '',
        address: '',
    })
    const [directorData, setDirectorData] = useState({
        inn: '',
        companyName: '',
        directorName: '',
        directorPinflFromFile: '',
        userPinflInput: '',
    })

    // --- Form Hook ---
    const {
        handleSubmit,
        formState: { errors, isSubmitting },
        control,
        reset,
    } = useForm<FinalStepSchema>({
        resolver: zodResolver(finalStepSchema),
    })

    // --- Logic: Navigation ---
    const handleRoleSelect = (selectedRole: Role) => {
        setRole(selectedRole)
        setCurrentStep('verification')
        setMessage?.('')
    }

    const handleBack = () => {
        if (currentStep === 'account') {
            setCurrentStep('verification')
        } else {
            setCurrentStep('selection')
            setRole(null)
            setCitizenData({ pinfl: '', fullName: '', address: '' })
            setDirectorData({
                ...directorData,
                companyName: '',
                userPinflInput: '',
            })
            reset()
        }
        setMessage?.('')
    }

    // --- Logic: Citizen Check (Real API) ---
    const checkCitizenPinfl = async () => {
        if (citizenData.pinfl.length !== 14) {
            setMessage?.('PINFL must be 14 digits')
            return
        }
        setIsLoading(true)
        setMessage?.('')

        try {
            const res = await getPersonByPinfl(citizenData.pinfl)

            // Adapt based on your actual API response structure
            if (res && res.data) {
                setCitizenData((prev) => ({
                    ...prev,
                    fullName: res.data.name || res.fio || 'Unknown Name',
                    address: res.data.address || 'Address Found',
                }))
                setCurrentStep('account')
            } else {
                throw new Error('No data found')
            }
        } catch (error) {
            console.error(error)
            setMessage?.('User not found or connection failed')
        } finally {
            setIsLoading(false)
        }
    }

    // --- Logic: Company Check (Real API) ---
    const checkCompanyInn = async () => {
        if (directorData.inn.length !== 9) {
            setMessage?.('INN must be 9 digits')
            return
        }
        setIsLoading(true)
        setMessage?.('')

        try {
            const res = await getCompanyByInn(directorData.inn)

            // Adapt based on your actual API response structure
            if (res && res.data) {
                setDirectorData((prev) => ({
                    ...prev,
                    companyName: res.data.name || 'Unknown Company',
                    directorName: res.data.directorName || 'Unknown Director',
                    directorPinflFromFile: res.data.directorPinfl || '', // Important for verification
                }))
            } else {
                throw new Error('Company not found')
            }
        } catch (error) {
            console.error(error)
            setMessage?.('Company not found or connection failed')
        } finally {
            setIsLoading(false)
        }
    }

    const verifyDirectorPinfl = () => {
        if (
            directorData.userPinflInput !== directorData.directorPinflFromFile
        ) {
            setMessage?.('Director PINFL does not match company records')
            return
        }
        setCurrentStep('account')
        setMessage?.('')
    }

    // --- Logic: Final Registration (Real API) ---
    const onFinalSubmit = async (values: FinalStepSchema) => {
        if (disableSubmit) return

        let success = false
        const { phone, password } = values

        try {
            if (role === 'citizen') {
                const payload = {
                    phone,
                    password,
                    pinfl: citizenData.pinfl,
                }
                success = await registerUser(payload)
            } else if (role === 'director') {
                const payload = {
                    phone,
                    password,
                    inn: directorData.inn,
                    pinfl: directorData.userPinflInput,
                }
                success = await registerDirector(payload)
            }

            if (success) {
                // Redirect on success
                // Your store automatically logs them in if register returns true
                navigate('/dashboard')
            } else {
                setMessage?.('Registration failed. Please try again.')
            }
        } catch (error: any) {
            const errorMsg =
                error.response?.data?.message || 'Registration error'
            setMessage?.(errorMsg)
        }
    }

    // --- RENDERERS ---

    const renderRoleSelection = () => (
        <div className="flex flex-col gap-4">
            <div
                className="group border border-gray-200 hover:border-blue-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => handleRoleSelect('citizen')}
            >
                <div className="p-3 bg-blue-50 text-blue-500 rounded-full text-2xl">
                    <HiUser />
                </div>
                <div>
                    <div className="font-bold text-lg">Citizen</div>
                    <div className="text-gray-500 text-sm">
                        Register as an individual
                    </div>
                </div>
            </div>

            <div
                className="group border border-gray-200 hover:border-green-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => handleRoleSelect('director')}
            >
                <div className="p-3 bg-green-50 text-green-500 rounded-full text-2xl">
                    <HiOfficeBuilding />
                </div>
                <div>
                    <div className="font-bold text-lg">Organization</div>
                    <div className="text-gray-500 text-sm">
                        Register as a company director
                    </div>
                </div>
            </div>
        </div>
    )

    const renderCitizenFlow = () => (
        <div className="flex flex-col gap-6">
            {/* Step 1: Verification */}
            <div>
                <label className="font-semibold mb-2 block text-gray-700 dark:text-gray-200 text-sm">
                    PINFL (JSHSHIR)
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter 14-digit PINFL"
                        value={citizenData.pinfl}
                        onChange={(e: any) =>
                            setCitizenData({
                                ...citizenData,
                                pinfl: e.target.value,
                            })
                        }
                        disabled={currentStep === 'account'}
                    />
                    <Button
                        variant="solid"
                        loading={isLoading}
                        onClick={checkCitizenPinfl}
                        disabled={currentStep === 'account'}
                        type="button"
                    >
                        Check
                    </Button>
                </div>
            </div>

            {/* Step 2: Account Creation */}
            {currentStep === 'account' && (
                <div className="animate-fade-in">
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                        <FormItem label="Full Name" className="mb-2">
                            <Input
                                value={citizenData.fullName}
                                disabled
                                className="!bg-transparent !border-none !p-0 font-bold text-gray-900 dark:text-gray-100"
                            />
                        </FormItem>
                        <FormItem label="Address" className="mb-0">
                            <Input
                                textArea
                                value={citizenData.address}
                                disabled
                                className="!bg-transparent !border-none !p-0 resize-none text-gray-600 dark:text-gray-300"
                            />
                        </FormItem>
                    </div>

                    <Form onSubmit={handleSubmit(onFinalSubmit)}>
                        <FormItem
                            label="Phone Number"
                            invalid={Boolean(errors.phone)}
                            errorMessage={errors.phone?.message}
                        >
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="+998..."
                                        autoComplete="off"
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="Password"
                            invalid={Boolean(errors.password)}
                            errorMessage={errors.password?.message}
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Password"
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="Confirm Password"
                            invalid={Boolean(errors.confirmPassword)}
                            errorMessage={errors.confirmPassword?.message}
                        >
                            <Controller
                                name="confirmPassword"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Confirm Password"
                                    />
                                )}
                            />
                        </FormItem>
                        <Button
                            block
                            loading={isSubmitting}
                            variant="solid"
                            type="submit"
                        >
                            Complete Registration
                        </Button>
                    </Form>
                </div>
            )}
        </div>
    )

    const renderDirectorFlow = () => (
        <div className="flex flex-col gap-6">
            {/* Step 1: Search Company */}
            <div>
                <label className="font-semibold mb-2 block text-gray-700 dark:text-gray-200 text-sm">
                    Company INN
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter 9-digit INN"
                        value={directorData.inn}
                        onChange={(e: any) =>
                            setDirectorData({
                                ...directorData,
                                inn: e.target.value,
                            })
                        }
                        disabled={!!directorData.companyName}
                    />
                    <Button
                        variant="solid"
                        loading={isLoading}
                        onClick={checkCompanyInn}
                        disabled={!!directorData.companyName}
                        type="button"
                    >
                        Search
                    </Button>
                </div>
            </div>

            {/* Found Company Info */}
            {directorData.companyName && (
                <Alert type="info" title="Company Found">
                    <div className="font-bold text-lg">
                        {directorData.companyName}
                    </div>
                    <div>Director: {directorData.directorName}</div>
                </Alert>
            )}

            {/* Step 2: Verify Director */}
            {directorData.companyName && currentStep === 'verification' && (
                <div className="animate-fade-in">
                    <label className="font-semibold mb-2 block text-gray-700 dark:text-gray-200 text-sm">
                        Director PINFL (Verify)
                    </label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter Director PINFL"
                            value={directorData.userPinflInput}
                            onChange={(e: any) =>
                                setDirectorData({
                                    ...directorData,
                                    userPinflInput: e.target.value,
                                })
                            }
                        />
                        <Button
                            variant="solid"
                            color="green-600"
                            onClick={verifyDirectorPinfl}
                            type="button"
                        >
                            Verify
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Account Creation */}
            {currentStep === 'account' && (
                <div className="animate-fade-in">
                    <Form onSubmit={handleSubmit(onFinalSubmit)}>
                        <FormItem
                            label="Phone Number"
                            invalid={Boolean(errors.phone)}
                            errorMessage={errors.phone?.message}
                        >
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="+998..."
                                        autoComplete="off"
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="Password"
                            invalid={Boolean(errors.password)}
                            errorMessage={errors.password?.message}
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Password"
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem
                            label="Confirm Password"
                            invalid={Boolean(errors.confirmPassword)}
                            errorMessage={errors.confirmPassword?.message}
                        >
                            <Controller
                                name="confirmPassword"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="password"
                                        placeholder="Confirm Password"
                                    />
                                )}
                            />
                        </FormItem>
                        <Button
                            block
                            loading={isSubmitting}
                            variant="solid"
                            type="submit"
                        >
                            Register Organization
                        </Button>
                    </Form>
                </div>
            )}
        </div>
    )

    return (
        <div className={className}>
            {/* Header: Back Button */}
            {currentStep !== 'selection' && (
                <div className="mb-6">
                    <Button
                        size="sm"
                        variant="plain"
                        icon={<HiArrowLeft />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                </div>
            )}

            {/* Dynamic Title */}
            <div className="mb-6">
                {currentStep === 'selection' && (
                    <h3 className="text-center">Choose Registration Type</h3>
                )}
                {role === 'citizen' && currentStep !== 'selection' && (
                    <h3 className="text-center">Citizen Registration</h3>
                )}
                {role === 'director' && currentStep !== 'selection' && (
                    <h3 className="text-center">Organization Registration</h3>
                )}
            </div>

            {/* Content Switch */}
            {currentStep === 'selection' && renderRoleSelection()}
            {role === 'citizen' && renderCitizenFlow()}
            {role === 'director' && renderDirectorFlow()}
        </div>
    )
}

export default SignUpForm
