// Authorized Railway Personnel Credentials & Profiles for South Central Railway (Vijayawada Division)

export interface StoredUser {
  employeeId: string;
  email: string;
  passwordHash: string; // Plain/hashed comparison
  name: string;
  designation: string;
  department: 'Operations' | 'P.Way' | 'S&T' | 'TRD' | 'All';
  role: 'MASTER' | 'Planning Officer' | 'COA / Operations' | 'P.Way Engineer' | 'S&T Engineer' | 'TRD Engineer';
  avatarInitials: string;
  permissions: string[];
}

export const AUTHORIZED_PERSONNEL: StoredUser[] = [
  {
    employeeId: 'EMP-IR-001',
    email: 'pcom.bza@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'V. Ramanathan',
    designation: 'Principal Chief Operations Manager (PCOM)',
    department: 'All',
    role: 'MASTER',
    avatarInitials: 'VR',
    permissions: ['all', 'overview', 'network', 'requests', 'approval', 'planning', 'conflict', 'execution', 'audit', 'live-trains']
  },
  {
    employeeId: 'EMP-IR-104',
    email: 'planning.dom@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'M. K. Rao',
    designation: 'Senior Divisional Operations Manager (Planning)',
    department: 'Operations',
    role: 'Planning Officer',
    avatarInitials: 'MR',
    permissions: ['overview', 'requests', 'planning', 'conflict', 'execution']
  },
  {
    employeeId: 'EMP-IR-210',
    email: 'control.bza@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'P. Murthy',
    designation: 'Chief Controller / Section Controller (BZA)',
    department: 'Operations',
    role: 'COA / Operations',
    avatarInitials: 'PM',
    permissions: ['overview', 'network', 'live-trains', 'conflict', 'execution']
  },
  {
    employeeId: 'EMP-IR-301',
    email: 'pway.den@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'A. K. Sharma',
    designation: 'Senior Divisional Engineer (Coordination / P.Way)',
    department: 'P.Way',
    role: 'P.Way Engineer',
    avatarInitials: 'AS',
    permissions: ['overview', 'requests', 'execution']
  },
  {
    employeeId: 'EMP-IR-402',
    email: 'snt.dste@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'Rajesh Verma',
    designation: 'Senior Divisional Signal & Telecom Engineer (Sr. DSTE)',
    department: 'S&T',
    role: 'S&T Engineer',
    avatarInitials: 'RV',
    permissions: ['overview', 'requests', 'execution']
  },
  {
    employeeId: 'EMP-IR-503',
    email: 'trd.dee@railnet.gov.in',
    passwordHash: 'RailSamnvay@2026',
    name: 'S. K. Nair',
    designation: 'Senior Divisional Electrical Engineer (Sr. DEE / TRD)',
    department: 'TRD',
    role: 'TRD Engineer',
    avatarInitials: 'SN',
    permissions: ['overview', 'requests', 'execution']
  }
];
