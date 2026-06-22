import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''

// Date formatting helper
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const d = new Date(dateString)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

serve(async (req) => {
  try {
    let isWebhook = false;
    let replyToken = '';
    let shouldProcess = true; // default true for cron triggers
    let customMessage = '';

    // Check if it's a POST request and has a JSON body
    if (req.method === 'POST') {
      try {
        const payload = await req.json();
        
        // Check if it's a LINE Webhook event
        if (payload && payload.events && Array.isArray(payload.events)) {
          isWebhook = true;
          shouldProcess = false; // By default don't process webhook unless it matches criteria

          for (const event of payload.events) {
            if (event.type === 'message' && event.message && event.message.type === 'text') {
              const text = event.message.text.trim().toLowerCase();
              if (text === 'hi') {
                shouldProcess = true;
                replyToken = event.replyToken;
                break;
              } else if (text === 'id' || text === 'ไอดี') {
                // Return Group ID or User ID
                const sourceId = event.source.groupId || event.source.userId;
                customMessage = `รหัสสำหรับกลุ่ม/แชทนี้คือ:\n${sourceId}`;
                replyToken = event.replyToken;
                shouldProcess = false; // Don't fetch DB
                break;
              }
            }
          }
        }
      } catch (e) {
        // If req.json() fails, it means it's not a valid JSON POST body.
        // We just continue as if it's a cron trigger with no body.
        console.log("No valid JSON payload, assuming cron trigger.");
      }
    }

    // If it's a webhook but doesn't match our criteria and has no custom message, just return 200 OK immediately
    if (isWebhook && !shouldProcess && !customMessage) {
      return new Response("OK", { status: 200 })
    }

    let message = ''

    // If we have a custom message (like replying with ID), skip DB fetch
    if (customMessage) {
      message = customMessage;
    } else {

    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Fetch Late Tasks (Customer POs and Supplier POs)
    const today = new Date().toISOString().split('T')[0]
    
    // 2.1 Fetch late Customer POs (Client POs - งานส่งลูกค้า)
    const { data: lateClientPos, error: clientError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number, 
        due_date, 
        customer_id, 
        customers(name),
        purchase_order_items(product_name, quantity),
        invoices(id, status, invoice_items(product_name, quantity))
      `)
      .lt('due_date', today)
      .not('status', 'in', '("Completed","Cancelled","Draft")')
      .order('due_date', { ascending: true })

    if (clientError) throw clientError

    // 2.2 Fetch late Supplier POs (Vendor POs - สั่งซื้อของ)
    const { data: lateSupplierPos, error: supplierError } = await supabase
      .from('supplier_pos')
      .select('po_number, delivery_date, supplier_id, suppliers(name)')
      .lt('delivery_date', today)
      .not('status', 'in', '("Completed","Cancelled","Draft")')
      .order('delivery_date', { ascending: true })

    if (supplierError) throw supplierError

    const totalLate = (lateClientPos?.length || 0) + (lateSupplierPos?.length || 0)

    if (totalLate === 0) {
      message = "✅ อัปเดตงานประจำวัน: ไม่พบงานล่าช้าในระบบวันนี้ครับ 🎉"
    } else {
      // 3. Format the message
      message = `🚨 แจ้งเตือนงานล่าช้าประจำวัน 🚨\n\nพบรายการล่าช้าทั้งหมด ${totalLate} รายการ:\n`
      
      if (lateClientPos && lateClientPos.length > 0) {
        message += `\n📦 **ส่งงานลูกค้า (Client PO)** - ${lateClientPos.length} รายการ\n`
        lateClientPos.forEach((po: any, index: number) => {
          const custName = po.customers?.name || 'ไม่ทราบชื่อลูกค้า'
          
          let deliveredMap: Record<string, number> = {};
          if (po.invoices) {
            const validInvoices = po.invoices.filter((inv: any) => inv.status !== 'Cancelled');
            validInvoices.forEach((inv: any) => {
              if (inv.invoice_items) {
                inv.invoice_items.forEach((item: any) => {
                  const name = item.product_name;
                  if (name) {
                    deliveredMap[name] = (deliveredMap[name] || 0) + Number(item.quantity || 0);
                  }
                });
              }
            });
          }

          let missingItemsStr = '';
          if (po.purchase_order_items) {
            po.purchase_order_items.forEach((item: any) => {
              const name = item.product_name;
              const delivered = name ? (deliveredMap[name] || 0) : 0;
              const remaining = Math.max(0, Number(item.quantity || 0) - delivered);
              if (remaining > 0) {
                missingItemsStr += `\n       - ${name}: ขาดอีก ${remaining.toLocaleString()} ชิ้น`;
              }
            });
          }

          message += `  ${index + 1}. PO: ${po.po_number}\n     ลูกค้า: ${custName}\n     กำหนดส่ง: ${formatDate(po.due_date)}${missingItemsStr}\n`
        })
      }

      if (lateSupplierPos && lateSupplierPos.length > 0) {
        message += `\n🛒 **สั่งซื้อของ (Vendor PO)** - ${lateSupplierPos.length} รายการ\n`
        lateSupplierPos.forEach((po: any, index: number) => {
          const suppName = po.suppliers?.name || 'ไม่ทราบชื่อผู้ขาย'
          message += `  ${index + 1}. PO: ${po.po_number}\n     ผู้ขาย: ${suppName}\n     กำหนดส่ง: ${formatDate(po.delivery_date)}\n`
        })
      }

      message += `\nกรุณาติดตามสถานะด้วยครับ/ค่ะ 🙏`
    }
    } // End of customMessage check

    // 4. Send message to LINE Messaging API
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

    if (replyToken) {
      const lineResponse = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          replyToken: replyToken,
          messages: messages
        })
      });
      if (!lineResponse.ok) {
        throw new Error(`LINE Reply Error: ${await lineResponse.text()}`);
      }
    } else if (lineGroupIds.length > 0) {
      // LINE Multicast API only supports userIds. For groups, we MUST loop and use Push API.
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
      // Fallback to broadcast
      const lineResponse = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({ messages: messages })
      });
      if (!lineResponse.ok) {
        throw new Error(`LINE Broadcast Error: ${await lineResponse.text()}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully." }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
