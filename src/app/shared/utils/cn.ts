import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gộp class Tailwind, class sau thắng class trước. Dùng cho mọi component dùng chung. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
