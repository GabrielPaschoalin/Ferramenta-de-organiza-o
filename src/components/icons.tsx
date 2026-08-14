import type { SVGProps } from 'react'
import type { NavIcon } from '@/lib/nav'

type IconProps = SVGProps<SVGSVGElement>

function svgProps(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.8 2.8L16.5 9" />
    </svg>
  )
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m8 5-5 2v13l5-2 8 2 5-2V5l-5 2-8-2z" />
      <path d="M8 5v13M16 7v13" />
    </svg>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 17H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
      <path d="m14 15 4-3-4-3" />
      <path d="M18 12H10" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 16V5" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 19h14" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m14 6-6 6 6 6" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m10 6 6 6-6 6" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  )
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3 5.5 15.1 3.1 17c1.6 3.1 4.9 5.2 8.9 5.2 2.7 0 4.9-.9 6.6-2.4l-3.1-2.4c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3z"
      />
      <path
        fill="#FBBC05"
        d="M3.1 7c-.6 1.2-1 2.6-1 4s.4 2.8 1 4l3.5-2.7c-.2-.6-.3-1.2-.3-1.3s.1-.8.3-1.3z"
      />
      <path
        fill="#4285F4"
        d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.8 14.7 2 12 2 8 2 4.7 4.1 3.1 7.2l3.5 2.7C7 7.6 9.3 5.8 12 5.8z"
      />
    </svg>
  )
}

const iconMap = {
  home: HomeIcon,
  check: CheckIcon,
  wallet: WalletIcon,
  map: MapIcon,
} as const

export function NavGlyph({ name, className }: { name: NavIcon; className?: string }) {
  const Icon = iconMap[name]
  return <Icon className={className} />
}
