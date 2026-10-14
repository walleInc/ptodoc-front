import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, Mail, MapPin } from 'lucide-react'
import { Button, Input, Label, Textarea } from '@/shared'

const CONTACT_EMAIL = 'info@pto-doc.ru'

const contactSchema = z.object({
  name: z.string().min(2, 'Укажите имя'),
  email: z.string().email('Неверный формат email'),
  message: z.string().min(10, 'Расскажите чуть подробнее — минимум 10 символов'),
})

type ContactFormData = z.infer<typeof contactSchema>

function buildMailto(data: ContactFormData): string {
  const subject = encodeURIComponent(`Заявка с сайта ПТО-Doc — ${data.name}`)
  const body = encodeURIComponent(
    `Имя: ${data.name}\nEmail: ${data.email}\n\n${data.message}`
  )
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

/** Подвал: форма связи, контакты, копирайт. */
export function LandingFooter() {
  const [mailHint, setMailHint] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
  })

  const onSubmit = (data: ContactFormData) => {
    // Бэкенд-эндпоинта для лидов нет — открываем почтовый клиент.
    window.location.href = buildMailto(data)
    setMailHint(true)
  }

  return (
    <footer id="contact" className="scroll-mt-16 bg-primary-950 text-primary-100">
      <div className="container-main py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Контакты */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Свяжитесь с нами</h2>
            <p className="mt-4 max-w-md text-primary-200">
              Расскажите о вашем объекте — покажем, как ПТО-Doc сократит время проверки исполнительной
              документации, и подключим вашу команду.
            </p>

            <ul className="mt-8 space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800 text-primary-300">
                  <Clock className="h-4 w-4" />
                </span>
                Ответим в течение рабочего дня
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800 text-primary-300">
                  <Mail className="h-4 w-4" />
                </span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800 text-primary-300">
                  <MapPin className="h-4 w-4" />
                </span>
                Работаем удалённо по всей России
              </li>
            </ul>
          </div>

          {/* Форма */}
          <div className="rounded-2xl border border-primary-800 bg-primary-900/60 p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="text-primary-100">
                  Имя
                </Label>
                <Input
                  id="contact-name"
                  placeholder="Иван Иванов"
                  error={errors.name?.message}
                  disabled={isSubmitting}
                  autoComplete="name"
                  {...register('name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-primary-100">
                  Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="ivan@example.com"
                  error={errors.email?.message}
                  disabled={isSubmitting}
                  autoComplete="email"
                  {...register('email')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-primary-100">
                  Сообщение
                </Label>
                <Textarea
                  id="contact-message"
                  placeholder="Опишите вашу задачу: тип объектов, объём документации…"
                  error={errors.message?.message}
                  disabled={isSubmitting}
                  className="min-h-[120px]"
                  {...register('message')}
                />
              </div>
              {mailHint && (
                <p className="text-sm text-primary-200">
                  Отправка через сайт пока недоступна. Откроется почтовый клиент —
                  либо напишите на{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-white">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              )}
              <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
                Отправить заявку
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-primary-800 pt-8 text-sm text-primary-300 sm:flex-row">
          <p>© {new Date().getFullYear()} ПТО-Doc. Все права защищены.</p>
          <p>AI-ассистент проверки исполнительной документации</p>
        </div>
      </div>
    </footer>
  )
}
