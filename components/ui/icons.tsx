import { SVGProps } from "react";

function IconBase({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 19.5c1.8-3 4.2-4.5 7.5-4.5s5.7 1.5 7.5 4.5" />
    </IconBase>
  );
}

export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 9.2 6 4.5 4.5 0 0 1 12 7.9 4.5 4.5 0 0 1 14.8 6 4.2 4.2 0 0 1 19 10.7C19 15.6 12 20 12 20Z" />
    </IconBase>
  );
}

export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.2 11.2c.1.5.5.8 1 .8h9.8c.5 0 .9-.3 1-.8L21 8H7" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M13.5 8H16V5h-2.5C10.9 5 9 7 9 9.8V12H7v3h2v5h3v-5h3l.5-3h-3.5V10c0-1.1.4-2 1.5-2Z" />
    </IconBase>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5.4 19.4 6.6 16A8.3 8.3 0 1 1 12 20a8.1 8.1 0 0 1-3.8-.9Z" />
      <path d="M9.3 10.2c.2-.5.4-.6.6-.6h.5c.1 0 .3 0 .4.3l.8 1.8c.1.2 0 .4-.1.5l-.5.6c-.1.1-.2.3 0 .5.3.6 1.1 1.7 2.5 2.2.2.1.4.1.5 0l.8-.9c.1-.1.3-.2.5-.1l1.8.7c.2.1.3.2.3.4v.5c0 .2-.1.5-.6.7-.4.2-.9.3-1.4.2-1-.2-2-.7-3.3-1.8-1.6-1.4-2.5-3-2.8-4.1-.2-.5-.1-1 .1-1.4Z" />
    </IconBase>
  );
}

export function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M21 8.8a2.8 2.8 0 0 0-2-2C17.4 6.3 12 6.3 12 6.3s-5.4 0-7 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2.5 12 29 29 0 0 0 3 15.2a2.8 2.8 0 0 0 2 2c1.6.5 7 .5 7 .5s5.4 0 7-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 21.5 12a29 29 0 0 0-.5-3.2Z" />
      <path d="m10 14.8 5-2.8-5-2.8v5.6Z" />
    </IconBase>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="9" width="3.2" height="10" />
      <path d="M6.1 7.1a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" />
      <path d="M11.3 19V9h3.1v1.4c.5-.9 1.7-1.8 3.4-1.8 3.3 0 3.7 2.2 3.7 5V19h-3.3v-4.6c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-3.3Z" />
    </IconBase>
  );
}
