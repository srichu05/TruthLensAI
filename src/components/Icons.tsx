interface P { size?: number; className?: string }

const ic = (d: string | string[], vb = '0 0 24 24') =>
  function Icon({ size = 18, className = '' }: P) {
    const ds = Array.isArray(d) ? d : [d]
    return (
      <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
        strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
        {ds.map((p, i) => <path key={i} d={p} />)}
      </svg>
    )
  }

export const HomeIcon       = ic(['M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z'])
export const SearchIcon     = ic(['M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z'])
export const ClockIcon      = ic(['M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z','M12 6v6l4 2'])
export const BookmarkIcon   = ic('M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z')
export const SettingsIcon   = ic(['M12 15a3 3 0 100-6 3 3 0 000 6z','M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'])
export const UserIcon       = ic(['M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z','M12 14c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z'])
export const LogoutIcon     = ic(['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4','M16 17l5-5-5-5','M21 12H9'])
export const ShieldIcon     = ic('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
export const ZapIcon        = ic('M13 2L3 14h9l-1 8 10-12h-9l1-8z')
export const CheckCircleIcon= ic(['M22 11.08V12a10 10 0 11-5.93-9.14','M22 4L12 14.01l-3-3'])
export const AlertTriangle  = ic(['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z','M12 9v4','M12 17h.01'])
export const InfoIcon       = ic(['M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z','M12 16v-4','M12 8h.01'])
export const UploadIcon     = ic(['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M17 8l-5-5-5 5','M12 3v12'])
export const LinkIcon       = ic(['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71','M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'])
export const FileTextIcon   = ic(['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'])
export const ArrowRightIcon = ic(['M5 12h14','M12 5l7 7-7 7'])
export const ChevronDownIcon= ic('M6 9l6 6 6-6')
export const ChevronRightIcon=ic('M9 18l6-6-6-6')
export const XIcon          = ic(['M18 6L6 18','M6 6l12 12'])
export const CheckIcon      = ic('M20 6L9 17l-5-5')
export const CopyIcon       = ic(['M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z','M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1'])
export const DownloadIcon   = ic(['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3'])
export const ShareIcon      = ic(['M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8','M16 6l-4-4-4 4','M12 2v13'])
export const BrainIcon      = ic(['M9.5 2A2.5 2.5 0 007 4.5v15A2.5 2.5 0 009.5 22a2.5 2.5 0 002.5-2.5V18h1a4 4 0 000-8h-1V4.5A2.5 2.5 0 009.5 2z','M14.5 10H15a2 2 0 010 4h-.5'])
export const TrendingUpIcon = ic(['M23 6l-9.5 9.5-5-5L1 18','M17 6h6v6'])
export const EyeIcon        = ic(['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 15a3 3 0 100-6 3 3 0 000 6z'])
export const FilterIcon     = ic('M22 3H2l8 9.46V19l4 2v-8.54L22 3z')
export const PlusIcon       = ic(['M12 5v14','M5 12h14'])
export const RefreshIcon    = ic(['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'])
export const EyeOffIcon     = ic(['M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94','M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19','M1 1l22 22'])
export const LockIcon       = ic(['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z','M7 11V7a5 5 0 0110 0v4'])
export const BellIcon       = ic(['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 01-3.46 0'])
export const MenuIcon       = ic(['M3 12h18','M3 6h18','M3 18h18'])
export const TrashIcon      = ic(['M3 6h18','M8 6V4h8v2','M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6'])
export const EditIcon       = ic(['M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7','M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'])
export const SunIcon        = ic(['M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42','M12 17a5 5 0 100-10 5 5 0 000 10z'])
export const MoonIcon       = ic('M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z')
export const MonitorIcon    = ic(['M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2z','M8 21h8','M12 17v4'])
export const NewspaperIcon  = ic(['M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'])
export const ExternalLinkIcon = ic(['M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6','M15 3h6v6','M10 14L21 3'])
export const GlobeIcon        = ic(['M12 2a10 10 0 100 20 10 10 0 000-20z','M2 12h20','M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'])
export const BarChart2Icon    = ic(['M18 20V10','M12 20V4','M6 20v-6'])
export const MailIcon         = ic(['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'])

