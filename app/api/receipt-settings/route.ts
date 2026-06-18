import { NextRequest, NextResponse } from 'next/server'
// Import prisma lazily inside handlers to avoid constructor running at module import
import { getCurrentUserWithRole, getUserFromRequest } from '@/lib/utils/auth-helpers'
import { z } from 'zod'

const receiptSettingsPayloadSchema = z.object({
  outlet_id: z.string().min(1),
  settings: z.object({
    logo_url: z.string().nullable().optional(),
    show_logo: z.union([z.boolean(), z.literal('on')]).optional(),
    header_text: z.string().nullable().optional(),
    address_text: z.string().nullable().optional(),
    footer_text: z.string().nullable().optional(),
    tax_info: z.string().nullable().optional(),
    social_media: z.string().nullable().optional(),
    wifi_password: z.string().nullable().optional(),
    paper_width: z.enum(['58mm', '80mm']).optional(),
    enable_auto_cut: z.union([z.boolean(), z.literal('on')]).optional(),
  }),
})

const normalizePaperWidth = (value: unknown): '58mm' | '80mm' => {
  if (value === '80mm') return '80mm'
  return '58mm'
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole())
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const outlet_id = request.nextUrl.searchParams.get('outlet_id')
    if (!outlet_id) {
      return NextResponse.json({ success: false, error: 'outlet_id is required' }, { status: 400 })
    }

    if (user.role !== 'admin' && user.role !== 'owner' && user.outlet_id !== outlet_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    try {
      const { prisma } = await import('@/lib/db/prisma-client')
      const settings = await prisma.receipt_settings.findUnique({ where: { outlet_id } })
      return NextResponse.json({ success: true, data: settings })
    } catch (innerErr: any) {
      console.error('[GET /api/receipt-settings] Prisma error:', innerErr)
      return NextResponse.json({ success: false, error: innerErr?.message ?? 'DB error' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[GET /api/receipt-settings] Error:', error)
    return NextResponse.json({ success: false, error: error?.message ?? 'Failed to fetch receipt settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request) ?? (await getCurrentUserWithRole())
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = receiptSettingsPayloadSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: parseResult.error.format() },
        { status: 400 }
      )
    }

    const { outlet_id, settings } = parseResult.data

    if (user.role !== 'admin' && user.role !== 'owner' && user.outlet_id !== outlet_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const normalized = {
      logo_url: settings.logo_url ?? null,
      show_logo: settings.show_logo === true || settings.show_logo === 'on',
      header_text: settings.header_text ?? null,
      address_text: settings.address_text ?? null,
      footer_text: settings.footer_text ?? null,
      tax_info: settings.tax_info ?? null,
      social_media: settings.social_media ?? null,
      wifi_password: settings.wifi_password ?? null,
      paper_width: normalizePaperWidth(settings.paper_width),
      enable_auto_cut: settings.enable_auto_cut === true || settings.enable_auto_cut === 'on',
    }

    try {
      const { prisma } = await import('@/lib/db/prisma-client')
      const receiptSettings = await prisma.receipt_settings.upsert({
        where: { outlet_id },
        update: normalized,
        create: { outlet_id, ...normalized },
      })
      return NextResponse.json({ success: true, data: receiptSettings })
    } catch (innerErr: any) {
      console.error('[PUT /api/receipt-settings] Prisma error:', innerErr)
      return NextResponse.json({ success: false, error: innerErr?.message ?? 'DB error' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[PUT /api/receipt-settings] Error:', error)
    return NextResponse.json({ success: false, error: error?.message ?? 'Failed to update receipt settings' }, { status: 500 })
  }
}
