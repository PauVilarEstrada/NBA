import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/ui/PageTransition'
import { useI18n } from '@/i18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="headline text-[clamp(4rem,18vw,12rem)] leading-none opacity-15">24</p>
        <h1 className="headline -mt-6 text-4xl">{t.notFound.title}</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
          {t.notFound.sub}
        </p>
        <Link to="/"
          className="mt-6 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A] px-6 py-3
                     text-sm font-bold uppercase tracking-widest text-white shadow-glow">
          {t.notFound.cta}
        </Link>
      </div>
    </PageTransition>
  )
}
