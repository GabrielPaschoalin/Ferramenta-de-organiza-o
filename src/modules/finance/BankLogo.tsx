import type { AccountInstitution } from '@/modules/finance/types'

export function BankLogo({
  institution,
  className = 'h-6 w-6',
}: {
  institution: AccountInstitution | 'all'
  className?: string
}) {
  if (institution === 'nubank') return <NubankLogo className={className} />
  if (institution === 'inter') return <InterLogo className={className} />
  if (institution === 'beevale') return <BeeValeLogo className={className} />
  if (institution === 'all') return <AllAccountsLogo className={className} />
  return <OtherBankLogo className={className} />
}

function NubankLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#820AD1" />
      <path
        fill="#fff"
        d="M10.2 21.8c0-3.4 2-5.6 5.6-6.7 2.1-.7 3.3-1.3 3.3-2.5 0-1.1-.8-1.8-2.2-1.8-1.6 0-2.6.8-2.8 2.3H11c.3-2.8 2.5-4.9 6.1-4.9 3.6 0 5.7 1.9 5.7 4.7 0 3.3-2.1 5.3-5.8 6.5-2.2.7-3.3 1.4-3.3 2.6 0 1.1.9 1.8 2.4 1.8 1.8 0 2.8-.9 3.1-2.5h3.1c-.4 2.9-2.7 5-6.3 5-3.7 0-5.8-1.9-5.8-4.5Z"
      />
    </svg>
  )
}

function InterLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#FF7A00" />
      <path
        fill="#fff"
        d="M7.4 11.2h3.1v9.6H7.4v-9.6Zm4.8 0h3v1.7c.6-1.2 1.8-2 3.4-2 2.6 0 4.2 1.7 4.2 4.6v5.3h-3.1v-4.7c0-1.6-.8-2.5-2.2-2.5s-2.2.9-2.2 2.5v4.7h-3.1v-9.6Zm12.3 0h3.1v9.6h-3.1v-9.6Z"
      />
    </svg>
  )
}

function BeeValeLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1F8A4C" />
      <path
        fill="#F5C518"
        d="M16 7.4c2.2 0 3.6 1.6 3.6 3.2 0 1.2-.6 2.1-1.5 2.7 1.7.6 2.9 2.1 2.9 4 0 2.4-2.1 4.2-5 4.2s-5-1.8-5-4.2c0-1.9 1.2-3.4 2.9-4-.9-.6-1.5-1.5-1.5-2.7 0-1.6 1.4-3.2 3.6-3.2Z"
      />
      <path fill="#1F8A4C" d="M14.2 12.8h3.6v1.3h-3.6zm0 2.6h3.6v1.3h-3.6z" />
      <path
        fill="#fff"
        d="M10.8 23.2c.4-1.2 1.8-2 5.2-2s4.8.8 5.2 2H10.8Z"
      />
    </svg>
  )
}

function AllAccountsLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0F172A" />
      <path
        fill="#fff"
        d="M8 13.2 16 8l8 5.2V22a1.6 1.6 0 0 1-1.6 1.6H9.6A1.6 1.6 0 0 1 8 22v-8.8Z"
      />
      <path fill="#0F172A" d="M14.2 16.4h3.6V23H14.2z" />
    </svg>
  )
}

function OtherBankLogo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#475569" />
      <path
        fill="#fff"
        d="M8.5 12.8h15v2.1h-15v-2.1Zm0 4.3h15v2.1h-15v-2.1Zm0 4.3h10v2.1h-10v-2.1Z"
      />
    </svg>
  )
}
