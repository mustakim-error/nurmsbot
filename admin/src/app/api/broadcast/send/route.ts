import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BOT_TOKEN = '8711373245:AAHZMSBwkhKrNjsyj5yQRYdw0E2YgVvpzWk';
const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://nurms-bot-default-rtdb.firebaseio.com';

interface TelegramUser {
  telegram_id?: string;
  name?: string;
  username?: string;
  balance?: number;
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      photoUrl,
      buttonText,
      buttonUrl,
      targetAudience = 'all',
      testChatId,
      pinMessage = false
    } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message text is required.' }, { status: 400 });
    }

    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
    const cleanMsg = message.trim();

    // 1. Determine Recipients
    let recipients: { id: string; name: string; balance: number }[] = [];

    if (targetAudience === 'test') {
      if (!testChatId || String(testChatId).trim().length === 0) {
        return NextResponse.json({ error: 'Test Telegram Chat ID is required for test mode.' }, { status: 400 });
      }
      recipients = [{ id: String(testChatId).trim(), name: 'Admin', balance: 0 }];
    } else {
      // Fetch registered bot users from Firebase RTDB
      const usersRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
      if (!usersRes.ok) {
        return NextResponse.json({ error: 'Failed to retrieve users from database.' }, { status: 500 });
      }
      const usersData: Record<string, TelegramUser> = await usersRes.json();

      if (!usersData || Object.keys(usersData).length === 0) {
        return NextResponse.json({ error: 'No registered bot users found in database.' }, { status: 404 });
      }

      for (const [key, user] of Object.entries(usersData)) {
        const id = user.telegram_id ? String(user.telegram_id) : key;
        const bal = Number(user.balance || 0);

        if (targetAudience === 'has_balance' && bal <= 0) {
          continue;
        }

        recipients.push({
          id,
          name: user.name || 'Member',
          balance: bal
        });
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No matching users found for this audience filter.' }, { status: 404 });
    }

    const broadcastId = `bcast_${Date.now()}`;
    const startTime = new Date().toISOString();

    // 2. Initialize Broadcast Record in Firebase RTDB
    await fetch(`${FIREBASE_DB_URL}/broadcasts/${broadcastId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: broadcastId,
        message: cleanMsg,
        photoUrl: photoUrl || '',
        buttonText: buttonText || '',
        buttonUrl: buttonUrl || '',
        targetAudience,
        totalRecipients: recipients.length,
        sentCount: 0,
        failedCount: 0,
        blockedCount: 0,
        status: 'in_progress',
        createdAt: startTime
      })
    });

    // Build inline keyboard markup if button provided
    let replyMarkup: any = null;
    if (buttonText && buttonUrl && buttonUrl.startsWith('http')) {
      replyMarkup = {
        inline_keyboard: [
          [{ text: buttonText.trim(), url: buttonUrl.trim() }]
        ]
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    // Helper: Substitute dynamic template variables
    const personalize = (text: string, recipient: { id: string; name: string; balance: number }) => {
      return text
        .replaceAll('{name}', recipient.name)
        .replaceAll('{user_id}', recipient.id)
        .replaceAll('{balance}', recipient.balance.toFixed(2));
    };

    // Helper: Send to a single user with automatic Markdown parse error fallback
    const sendToUser = async (recipient: { id: string; name: string; balance: number }) => {
      const textToSend = personalize(cleanMsg, recipient);

      const makeRequest = async (usePhoto: boolean, useMarkdown: boolean) => {
        const endpoint = usePhoto ? 'sendPhoto' : 'sendMessage';
        const payload: Record<string, any> = {
          chat_id: recipient.id,
          disable_web_page_preview: false
        };

        if (usePhoto) {
          payload.photo = photoUrl;
          payload.caption = textToSend;
          if (useMarkdown) payload.parse_mode = 'Markdown';
        } else {
          payload.text = textToSend;
          if (useMarkdown) payload.parse_mode = 'Markdown';
        }

        if (replyMarkup) {
          payload.reply_markup = replyMarkup;
        }

        const res = await fetch(`https://api.telegram.org/bot${botToken}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        return res.json();
      };

      try {
        let result = await makeRequest(!!photoUrl, true);

        // Fallback 1: If Markdown parsing failed (400), retry without Markdown
        if (!result.ok && result.error_code === 400 && String(result.description).toLowerCase().includes('parse')) {
          result = await makeRequest(!!photoUrl, false);
        }

        // Fallback 2: If Photo URL failed (400), fallback to text message
        if (!result.ok && photoUrl && result.error_code === 400) {
          result = await makeRequest(false, true);
        }

        if (result.ok) {
          sentCount++;
          // Optional: Pin message
          if (pinMessage && result.result?.message_id) {
            fetch(`https://api.telegram.org/bot${botToken}/pinChatMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: recipient.id, message_id: result.result.message_id, disable_notification: true })
            }).catch(() => {});
          }
        } else {
          failedCount++;
          if (result.error_code === 403 || String(result.description).toLowerCase().includes('blocked') || String(result.description).toLowerCase().includes('deactivated')) {
            blockedCount++;
          }
        }
      } catch (e) {
        failedCount++;
      }
    };

    // 3. Dispatch to all recipients with 35ms pacing (stays under Telegram 30 msg/s limit)
    for (let i = 0; i < recipients.length; i++) {
      await sendToUser(recipients[i]);

      // Throttle slightly to comply with Telegram rate limits
      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, 35));
      }

      // Periodically update RTDB every 10 users for live progress tracking
      if (i % 10 === 0 || i === recipients.length - 1) {
        fetch(`${FIREBASE_DB_URL}/broadcasts/${broadcastId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentCount,
            failedCount,
            blockedCount,
            updatedAt: new Date().toISOString()
          })
        }).catch(() => {});
      }
    }

    // 4. Mark Final Completion Status in Firebase RTDB
    const completedAt = new Date().toISOString();
    await fetch(`${FIREBASE_DB_URL}/broadcasts/${broadcastId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentCount,
        failedCount,
        blockedCount,
        status: 'completed',
        completedAt
      })
    });

    return NextResponse.json({
      success: true,
      broadcastId,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      blockedCount,
      completedAt
    });
  } catch (error: any) {
    console.error('Broadcast API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal broadcast error' }, { status: 500 });
  }
}
