import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    const events = payload.events || []

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim()
        const replyToken = event.replyToken
        let replyMessages = []

        const lowerText = text.toLowerCase()
        if (
          lowerText.includes('เมนู') || lowerText.includes('menu') || 
          lowerText.includes('@บอท') || lowerText.includes('maw') ||
          lowerText.includes('เช็คงาน') || lowerText.includes('ถาม') ||
          lowerText === 'hi' || lowerText.includes('สวัสดี') || lowerText === 'hello'
        ) {
          replyMessages = [getFlexMenu()]
        } else if (text === 'PO ที่เลท') {
          replyMessages = [await getLatePOs()]
        } else if (text === 'ใบเบิกที่ยังไม่เสร็จ') {
          replyMessages = [await getPendingRequisitions()]
        } else if (text === 'งานที่ต้องส่งภายใน 3 วัน') {
          replyMessages = [await getTodayTasks()]
        } else if (text === 'ติดต่อ Admin') {
          replyMessages = [{ type: 'text', text: '📞 ติดต่อฝ่าย Admin บริษัท Multiply Auto Work\nโทร: 02-XXX-XXXX หรือ 08X-XXX-XXXX\n(สามารถพิมพ์ฝากข้อความไว้ในกลุ่มได้เลยครับ)' }]
        }

        if (replyMessages.length > 0) {
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: replyMessages
            })
          })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})

// --- Helper Functions ---

function getFlexMenu() {
  return {
    type: "flex",
    altText: "เมนูหลัก (Main Menu)",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "Factory Dashboard", weight: "bold", size: "xl", color: "#ffffff" },
          { type: "text", text: "เมนูคำสั่งลัดสำหรับทีมงาน", size: "sm", color: "#e2e8f0", margin: "sm" }
        ],
        backgroundColor: "#1e293b",
        paddingAll: "20px"
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#ef4444",
            action: { type: "message", label: "🔴 PO ที่เลท", text: "PO ที่เลท" }
          },
          {
            type: "button",
            style: "primary",
            color: "#f59e0b",
            action: { type: "message", label: "🟡 ใบเบิกที่ยังไม่เสร็จ", text: "ใบเบิกที่ยังไม่เสร็จ" }
          },
          {
            type: "button",
            style: "primary",
            color: "#10b981",
            action: { type: "message", label: "🟢 งานที่ต้องส่ง (3 วัน)", text: "งานที่ต้องส่งภายใน 3 วัน" }
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "message", label: "📞 ติดต่อ Admin", text: "ติดต่อ Admin" }
          }
        ],
        paddingAll: "20px"
      }
    }
  }
}

async function getLatePOs() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('po_number, due_date, customers(name)')
    .neq('status', 'Completed')
    .neq('status', 'Cancelled')
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(10)

  if (error || !data) return { type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล' }
  if (data.length === 0) return { type: 'text', text: '✨ ยอดเยี่ยมมาก! ตอนนี้ไม่มี PO ไหนที่ส่งล่าช้าเลยครับ' }

  let msg = `🚨 สรุป PO ที่เลยกำหนดส่ง (เลท):\n\n`
  data.forEach(po => {
    msg += `• [${po.po_number}] ${po.customers?.name || 'ลูกค้าทั่วไป'}\n`
    msg += `   กำหนดส่ง: ${po.due_date}\n`
  })
  if (data.length === 10) msg += `\n* แสดงเพียง 10 รายการแรก`
  return { type: 'text', text: msg }
}

async function getPendingRequisitions() {
  const { data, error } = await supabase
    .from('internal_requisitions')
    .select('requisition_number, requested_by, status')
    .in('status', ['Draft', 'Pending', 'Approved', 'Partial'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (error || !data) return { type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล' }
  if (data.length === 0) return { type: 'text', text: '✅ ไม่มีใบเบิกค้างในระบบครับ ทุกรายการเบิกถูกจ่ายของหมดแล้ว' }

  let msg = `📦 ใบเบิกของที่ยังดำเนินการไม่เสร็จ:\n\n`
  data.forEach(req => {
    let statusTxt = req.status
    if (req.status === 'Pending') statusTxt = 'รออนุมัติ'
    else if (req.status === 'Approved') statusTxt = 'รอจ่ายของ'
    else if (req.status === 'Draft') statusTxt = 'ร่าง (Draft)'
    else if (req.status === 'Partial') statusTxt = 'จ่ายบางส่วน'
    
    msg += `• [${req.requisition_number}] ผู้เบิก: ${req.requested_by}\n`
    msg += `   สถานะ: ${statusTxt}\n`
  })
  return { type: 'text', text: msg }
}

async function getTodayTasks() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const future = new Date(today)
  future.setDate(today.getDate() + 3)
  const futureStr = future.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('po_number, due_date, customers(name)')
    .neq('status', 'Completed')
    .neq('status', 'Cancelled')
    .gte('due_date', todayStr)
    .lte('due_date', futureStr)
    .order('due_date', { ascending: true })

  if (error || !data) return { type: 'text', text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล' }
  if (data.length === 0) return { type: 'text', text: '📭 ไม่มีคิวส่งงาน/ส่งของตาม PO ในอีก 3 วันข้างหน้าครับ' }

  let msg = `🚚 งานที่ต้องส่ง (วันนี้ - อีก 3 วัน):\n\n`
  data.forEach(po => {
    const dateObj = new Date(po.due_date)
    const formattedDate = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
    msg += `• [${po.po_number}] ${po.customers?.name || 'ลูกค้าทั่วไป'}\n`
    msg += `   กำหนดส่ง: ${formattedDate}\n`
  })
  msg += `\nรวมทั้งหมด ${data.length} รายการ`
  return { type: 'text', text: msg }
}
