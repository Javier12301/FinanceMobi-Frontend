import {
  Bus,
  Car,
  CreditCard,
  Drama,
  Dumbbell,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Lightbulb,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { Category, MovementType } from './types/category'

/**
 * Catálogo de íconos elegibles (clave estable -> componente lucide).
 * El backend, cuando soporte `icon`, debería guardar estas claves.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  cart: ShoppingCart,
  bus: Bus,
  car: Car,
  home: Home,
  lightbulb: Lightbulb,
  wifi: Wifi,
  phone: Smartphone,
  drama: Drama,
  dumbbell: Dumbbell,
  health: HeartPulse,
  education: GraduationCap,
  shirt: Shirt,
  gift: Gift,
  plane: Plane,
  receipt: Receipt,
  card: CreditCard,
  wallet: Wallet,
  piggy: PiggyBank,
  tag: Tag,
}

/** Paleta de colores para el fallback determinista. */
export const CATEGORY_COLORS = [
  '#3ABFBF', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981',
  '#3B82F6', '#EC4899', '#F97316', '#14B8A6', '#6366F1',
]

// Palabras clave -> ícono, para derivar de categorías sin icon (las default y similares).
const KEYWORDS: [RegExp, string][] = [
  [/comida|aliment|restau|almuerz|cena/i, 'utensils'],
  [/super|merc|compra/i, 'cart'],
  [/transp|colectiv|bus|tren|subte|uber|taxi/i, 'bus'],
  [/auto|nafta|combust|veh/i, 'car'],
  [/alquil|renta|hogar|casa/i, 'home'],
  [/servici|luz|gas|agua|electri/i, 'lightbulb'],
  [/internet|wifi|cable/i, 'wifi'],
  [/tel|celul|phone/i, 'phone'],
  [/ocio|entret|cine|juego|netflix|spotify/i, 'drama'],
  [/gym|deporte|salud|fitness/i, 'dumbbell'],
  [/medic|farmac|salud|hospital/i, 'health'],
  [/educ|curso|colegio|universidad/i, 'education'],
  [/ropa|vestim|indument/i, 'shirt'],
  [/regalo|gift/i, 'gift'],
  [/viaje|vuelo|hotel/i, 'plane'],
  [/sueldo|salario|ingreso|cobro/i, 'wallet'],
  [/transfer/i, 'card'],
  [/ahorro|inversi/i, 'piggy'],
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Devuelve ícono + color de una categoría. Usa los campos del backend si existen;
 * si no, deriva de forma determinista del nombre/tipo.
 * ponytail: fallback determinista hasta que el backend mande icon/color (v3).
 */
export function categoryMeta(category: Pick<Category, 'name' | 'movementType' | 'icon' | 'color'>) {
  const iconKey =
    (category.icon && CATEGORY_ICONS[category.icon] ? category.icon : null) ??
    KEYWORDS.find(([re]) => re.test(category.name))?.[1] ??
    defaultIconForType(category.movementType)
  const icon = CATEGORY_ICONS[iconKey] ?? Tag
  const color = category.color ?? CATEGORY_COLORS[hash(category.name) % CATEGORY_COLORS.length]
  return { icon, iconKey, color }
}

function defaultIconForType(type: MovementType): string {
  if (type === 'INCOME') return 'wallet'
  if (type === 'TRANSFER') return 'card'
  return 'tag'
}
