import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/shared'
import { submitPublicDemoLead } from '../model/demoApi'

interface DemoLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoLeadModal({ open, onOpenChange }: DemoLeadModalProps) {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setDone(false)
    setError(null)
    setSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Укажите email')
      return
    }
    setSubmitting(true)
    try {
      await submitPublicDemoLead({
        email: email.trim(),
        company: company.trim(),
        phone: phone.trim(),
        comment: comment.trim(),
      })
      setDone(true)
    } catch {
      setError('Не удалось отправить. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оставить заявку на подключение</DialogTitle>
          <DialogDescription>
            Оставьте контакты — подключим кабинет и полный объём проверок по объекту.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-700">
              Заявка принята. Мы свяжемся с вами по указанному email.
            </p>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Закрыть
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-lead-email">Email *</Label>
              <Input
                id="demo-lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-lead-company">Компания</Label>
              <Input
                id="demo-lead-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-lead-phone">Телефон</Label>
              <Input
                id="demo-lead-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-lead-comment">Комментарий</Label>
              <Textarea
                id="demo-lead-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" loading={submitting}>
                Отправить заявку
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
