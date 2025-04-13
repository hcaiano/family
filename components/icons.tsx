import { Loader2, LucideProps, type Icon as LucideIcon } from "lucide-react";

// Simple Google Icon component (replace with a proper SVG or library later)
const GoogleIcon = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="1em"
    height="1em"
    {...props}
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.47 0 6.5 1.18 8.97 3.48l6.55-6.61C35.23 2.6 29.91 0 24 0 14.62 0 6.81 5.54 3.01 13.57l7.58 5.86C12.57 13.4 17.84 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24c0-1.66-.14-3.26-.4-4.8H24v9.1h12.8c-.55 2.95-2.16 5.45-4.6 7.17l7.29 5.65C43.51 36.86 46.5 30.96 46.5 24z"
    />
    <path
      fill="#FBBC05"
      d="M10.59 28.7c-.5-.95-.79-2.05-.79-3.2s.29-2.25.79-3.2l-7.58-5.86C1.07 19.31 0 21.57 0 24s1.07 4.69 3.01 6.56l7.58-5.86z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.5 0 11.95-2.15 15.93-5.82l-7.29-5.65c-2.11 1.42-4.83 2.27-7.95 2.27-6.16 0-11.42-3.9-13.4-9.23l-7.58 5.86C6.81 42.46 14.62 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

export const Icons = {
  spinner: Loader2,
  google: GoogleIcon,
};

export type Icon = LucideIcon;
