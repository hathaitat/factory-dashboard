import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const payload = await req.json()
    const { requisition_number, requested_by, items_count, total_amount } = payload

    if (!requisition_number) {
      return new Response(JSON.stringify({ error: 'Missing requisition_number' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Format the message
    const formattedAmount = Number(total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const message = `📝 มีการเปิดใบเบิก/สั่งซื้อใหม่\nเลขที่: ${requisition_number}\nผู้ขอ: ${requested_by || 'ไม่ระบุ'}\nรายการ: ${items_count || 0} ชิ้น\nยอดรวม: ฿${formattedAmount}\n\nกรุณาตรวจสอบในระบบครับ 🙏`;

    // Send message to LINE Messaging API
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set in environment variables.')
    }

    const lineGroupIdsRaw = Deno.env.get('LINE_GROUP_IDS') ?? '';
    const lineGroupIds = lineGroupIdsRaw.split(',').map(id => id.trim()).filter(id => id);
    if (!lineGroupIds.includes('C72b77235c2ffadc9e7a5106ed98ed977')) {
      lineGroupIds.push('C72b77235c2ffadc9e7a5106ed98ed977');
    }

    const messages = [
      {
        type: 'text',
        text: message
      }
    ];

    if (lineGroupIds.length > 0) {
      const pushPromises = lineGroupIds.map(groupId => {
        return fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            to: groupId,
            messages: messages
          })
        });
      });

      const responses = await Promise.all(pushPromises);
      for (const res of responses) {
        if (!res.ok) {
          const errorText = await res.text();
          console.error('LINE Push API Error:', errorText);
          throw new Error(`Failed to send LINE message: ${errorText}`);
        }
      }
    } else {
      const lineResponse = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ messages: messages })
      });

      if (!lineResponse.ok) {
        const errorText = await lineResponse.text();
        console.error('LINE Broadcast API Error:', errorText);
        throw new Error(`Failed to send LINE message: ${errorText}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
