import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form' // Assuming generic FormItem exists or use div
import { HiUser, HiOfficeBuilding } from 'react-icons/hi' // Icons
import Spinner from '@/components/ui/Spinner'

// --- Types ---
type RegistrationRole = 'citizen' | 'director' | null
type Step = 'selection' | 'verification' | 'account'

interface SignUpFormProps {
    disableSubmit?: boolean
    setMessage: (msg: string) => void
    currentStep: Step
    setCurrentStep: (step: Step) => void
}

const SignUpForm = ({
    disableSubmit,
    setMessage,
    currentStep,
    setCurrentStep,
}: SignUpFormProps) => {
    // --- State ---
    const [currentRole, setCurrentRole] = useState<RegistrationRole>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)

    // Citizen Model
    const [citizenModel, setCitizenModel] = useState({
        pinfl: '',
        fullName: '',
        address: '',
        phone: '',
        password: '',
    })

    // Director Model
    const [directorModel, setDirectorModel] = useState({
        inn: '',
        companyName: '',
        directorName: '',
        directorPinflFromFile: '',
        userPinfl: '',
        phone: '',
        password: '',
        confirmPassword: '',
    })

    // --- Actions ---

    const selectRole = (role: RegistrationRole) => {
        setCurrentRole(role)
        setCurrentStep('verification')
        setMessage('') // Clear old errors
    }

    // --- API Logic (Citizen) ---

    const checkCitizenPinfl = async () => {
        if (citizenModel.pinfl.length !== 14) {
            setMessage('PINFL must be 14 digits')
            return
        }
        setSearchLoading(true)
        setMessage('')

        try {
            // REPLACE WITH YOUR API CALL
            // const data = await api.getPersonByPinfl(citizenModel.pinfl)

            // Mocking success for demo:
            setTimeout(() => {
                setCitizenModel((prev) => ({
                    ...prev,
                    fullName: 'Test User Citizen',
                    address: 'Tashkent, Uzbekistan',
                }))
                setCurrentStep('account')
                setSearchLoading(false)
            }, 1000)
        } catch (error) {
            setMessage('User not found or connection error')
            setSearchLoading(false)
        }
    }

    const registerCitizen = async () => {
        // Simple validation
        if (!citizenModel.phone || !citizenModel.password) {
            setMessage('Phone and Password are required')
            return
        }

        setIsLoading(true)
        try {
            // REPLACE WITH YOUR API CALL
            // await api.registerUser(citizenModel)
            console.log('Registering Citizen', citizenModel)

            // Simulate success
            setTimeout(() => {
                window.location.href = '/' // Redirect
            }, 1000)
        } catch (error) {
            setMessage('Registration failed')
            setIsLoading(false)
        }
    }

    // --- API Logic (Director) ---

    const checkCompanyInn = async () => {
        if (directorModel.inn.length !== 9) {
            setMessage('INN must be 9 digits')
            return
        }
        setSearchLoading(true)
        setMessage('')

        try {
            // REPLACE WITH YOUR API CALL
            // const data = await api.getCompanyByInn(directorModel.inn)

            // Mocking success
            setTimeout(() => {
                setDirectorModel((prev) => ({
                    ...prev,
                    companyName: 'ACME LLC',
                    directorName: 'Director John Doe',
                    directorPinflFromFile: '12345678901234', // Mock PINFL to match against
                }))
                setSearchLoading(false)
            }, 1000)
        } catch (error) {
            setMessage('Company not found')
            setSearchLoading(false)
        }
    }

    const verifyDirectorPinfl = () => {
        if (directorModel.userPinfl !== directorModel.directorPinflFromFile) {
            setMessage('Director PINFL does not match company records')
            return
        }
        setCurrentStep('account')
        setMessage('')
    }

    const registerDirector = async () => {
        if (!directorModel.phone || !directorModel.password) {
            setMessage('Phone and Password are required')
            return
        }

        setIsLoading(true)
        try {
            // REPLACE WITH YOUR API CALL
            console.log('Registering Director', directorModel)

            // Simulate success
            setTimeout(() => {
                window.location.href = '/'
            }, 1000)
        } catch (error) {
            setMessage('Registration failed')
            setIsLoading(false)
        }
    }

    // --- Render Helpers ---

    const renderSelectionStep = () => (
        <div className="flex flex-col gap-4">
            <div
                className="group border border-gray-200 dark:border-gray-700 hover:border-blue-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => selectRole('citizen')}
            >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                    <HiUser className="text-2xl text-blue-500" />
                </div>
                <div>
                    <div className="font-bold text-lg heading-text">
                        Citizen
                    </div>
                    <div className="text-gray-500 text-sm">
                        Register as an individual
                    </div>
                </div>
            </div>

            <div
                className="group border border-gray-200 dark:border-gray-700 hover:border-green-500 cursor-pointer p-4 rounded-lg flex items-center gap-4 transition-all"
                onClick={() => selectRole('director')}
            >
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                    <HiOfficeBuilding className="text-2xl text-green-500" />
                </div>
                <div>
                    <div className="font-bold text-lg heading-text">
                        Organization
                    </div>
                    <div className="text-gray-500 text-sm">
                        Register as a company director
                    </div>
                </div>
            </div>
        </div>
    )

    const renderCitizenForm = () => (
        <div className="flex flex-col gap-4">
            {/* Step 1: Check PINFL */}
            <div>
                <label className="font-semibold mb-2 block text-sm">
                    PINFL
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter 14-digit PINFL"
                        value={citizenModel.pinfl}
                        onChange={(e: any) =>
                            setCitizenModel({
                                ...citizenModel,
                                pinfl: e.target.value,
                            })
                        }
                        disabled={currentStep === 'account'}
                    />
                    <Button
                        variant="solid"
                        loading={searchLoading}
                        onClick={checkCitizenPinfl}
                        disabled={currentStep === 'account'}
                    >
                        Check
                    </Button>
                </div>
            </div>

            {/* Step 2: Account Details (Shown after check) */}
            {currentStep === 'account' && (
                <div className="animate-fade-in flex flex-col gap-4 mt-2">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="mb-2">
                            <span className="text-xs text-gray-500 uppercase font-bold">
                                Full Name
                            </span>
                            <div className="font-semibold">
                                {citizenModel.fullName}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">
                                Address
                            </span>
                            <div className="text-sm">
                                {citizenModel.address}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Phone Number
                        </label>
                        <Input
                            placeholder="+998..."
                            value={citizenModel.phone}
                            onChange={(e: any) =>
                                setCitizenModel({
                                    ...citizenModel,
                                    phone: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Password
                        </label>
                        <Input
                            type="password"
                            placeholder="Create a password"
                            value={citizenModel.password}
                            onChange={(e: any) =>
                                setCitizenModel({
                                    ...citizenModel,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    <Button
                        block
                        variant="solid"
                        loading={isLoading}
                        onClick={registerCitizen}
                        disabled={disableSubmit}
                    >
                        Complete Registration
                    </Button>
                </div>
            )}
        </div>
    )

    const renderDirectorForm = () => (
        <div className="flex flex-col gap-4">
            {/* Step 1: Check INN */}
            <div>
                <label className="font-semibold mb-2 block text-sm">
                    Company INN
                </label>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter 9-digit INN"
                        value={directorModel.inn}
                        onChange={(e: any) =>
                            setDirectorModel({
                                ...directorModel,
                                inn: e.target.value,
                            })
                        }
                        disabled={!!directorModel.companyName}
                    />
                    <Button
                        variant="solid"
                        loading={searchLoading}
                        onClick={checkCompanyInn}
                        disabled={!!directorModel.companyName}
                    >
                        Search
                    </Button>
                </div>
            </div>

            {/* Found Company Info */}
            {directorModel.companyName && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 animate-fade-in">
                    <div className="text-sm text-gray-500">Company Found:</div>
                    <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {directorModel.companyName}
                    </div>
                    <div className="text-sm mt-2">
                        Director:{' '}
                        <span className="font-medium">
                            {directorModel.directorName}
                        </span>
                    </div>
                </div>
            )}

            {/* Step 2: Verify Director PINFL */}
            {directorModel.companyName && currentStep === 'verification' && (
                <div className="animate-fade-in mt-2">
                    <Alert type="info" className="mb-4">
                        Please enter the Director's PINFL to verify ownership.
                    </Alert>
                    <label className="font-semibold mb-2 block text-sm">
                        Director PINFL
                    </label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter PINFL"
                            value={directorModel.userPinfl}
                            onChange={(e: any) =>
                                setDirectorModel({
                                    ...directorModel,
                                    userPinfl: e.target.value,
                                })
                            }
                        />
                        <Button
                            variant="solid"
                            color="green-500"
                            onClick={verifyDirectorPinfl}
                        >
                            Verify
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Account Creation */}
            {currentStep === 'account' && (
                <div className="animate-fade-in flex flex-col gap-4 mt-2">
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    <h4 className="font-bold text-lg">Account Details</h4>

                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Phone Number
                        </label>
                        <Input
                            placeholder="+998..."
                            value={directorModel.phone}
                            onChange={(e: any) =>
                                setDirectorModel({
                                    ...directorModel,
                                    phone: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div>
                        <label className="font-semibold mb-2 block text-sm">
                            Password
                        </label>
                        <Input
                            type="password"
                            placeholder="Create a password"
                            value={directorModel.password}
                            onChange={(e: any) =>
                                setDirectorModel({
                                    ...directorModel,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    <Button
                        block
                        variant="solid"
                        loading={isLoading}
                        onClick={registerDirector}
                        disabled={disableSubmit}
                    >
                        Register Organization
                    </Button>
                </div>
            )}
        </div>
    )

    // --- Main Render Switch ---

    if (currentStep === 'selection') {
        return renderSelectionStep()
    }

    return (
        <div className="animate-fade-in">
            {currentRole === 'citizen'
                ? renderCitizenForm()
                : renderDirectorForm()}
        </div>
    )
}

export default SignUpForm
