import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let payload;
    if (req.method === 'POST') {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch (e) {
        payload = {};
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      payload = {
        requisition_number: url.searchParams.get('requisition_number'),
        requested_by: url.searchParams.get('requested_by'),
        items_count: url.searchParams.get('items_count'),
        total_amount: url.searchParams.get('total_amount'),
        action_type: url.searchParams.get('action_type') || 'create',
        items_detail: url.searchParams.get('items_detail') || ''
      };
    } else {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    const { requisition_number, requested_by, items_count, total_amount, action_type, items_detail } = payload

    if (!requisition_number) {
      return new Response(JSON.stringify({ error: 'Missing requisition_number' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const formattedAmount = Number(total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const actionText = action_type === 'update' ? 'มีการแก้ไข' : 'มีการเปิด';
    let message = `📝 ${actionText}ใบเบิก/สั่งซื้อ${action_type === 'update' ? '' : 'ใหม่'}\nเลขที่: ${requisition_number}\nผู้ขอ: ${requested_by || 'ไม่ระบุ'}\nจำนวนรายการ: ${items_count || 0} ชิ้น\nยอดรวม: ฿${formattedAmount}`;

    if (items_detail) {
      message += `\n\n📌 รายการสิ่งของ:\n${items_detail}`;
    }

    message += `\n\nกรุณาตรวจสอบในระบบครับ 🙏`;

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set.')
    }

    const lineGroupIdsRaw = Deno.env.get('LINE_GROUP_IDS') ?? '';
    const lineGroupIds = lineGroupIdsRaw.split(',').map(id => id.trim()).filter(id => id);
    if (!lineGroupIds.includes('C72b77235c2ffadc9e7a5106ed98ed977')) {
      lineGroupIds.push('C72b77235c2ffadc9e7a5106ed98ed977');
    }

    const messages = [{ type: 'text', text: message }];

    if (lineGroupIds.length > 0) {
      const pushPromises = lineGroupIds.map(groupId => {
        return fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          },
          body: JSON.stringify({ to: groupId, messages: messages })
        });
      });
      await Promise.all(pushPromises);
    } else {
      await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ messages: messages })
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
