import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from '@/shared'
import { useAuthStore } from '../model/authStore'
import { authApi } from '../api/authApi'

const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Введите пароль'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      await authApi.login(data)
      const user = await authApi.me()
      setUser(user)
      navigate(from === '/login' ? '/dashboard' : from, { replace: true })
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 401) {
        setError('Неверный email или пароль')
      } else {
        setError('Неверный email или пароль')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8 sm:py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-xl font-bold text-gray-900 sm:text-2xl">ПТО-Doc</CardTitle>
          <CardDescription className="text-gray-500">Войдите в личный кабинет</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ivan@example.com"
                error={errors.email?.message}
                {...register('email')}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                error={errors.password?.message}
                {...register('password')}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Войти
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-center text-sm text-gray-500">
          {import.meta.env.VITE_USE_MOCKS === 'true'
            ? 'Моки: owner@pto.example.com / engineer@pto.example.com, пароль password123'
            : 'Сид: engineer@ai-pto.local'}
        </CardFooter>
      </Card>
    </div>
  )
}
