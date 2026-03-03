import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { profiles, subscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing Razorpay Signature' }, { status: 400 });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 400 });
        }

        const event = JSON.parse(rawBody);

        switch (event.event) {
            case 'subscription.activated': {
                const userId = event.payload.subscription.entity.notes.userId;
                const plan = event.payload.subscription.entity.notes.plan;

                if (userId && plan) {
                    await db.update(profiles)
                        .set({ plan: plan })
                        .where(eq(profiles.id, userId));

                    await db.update(subscriptions)
                        .set({ status: 'active' })
                        .where(eq(subscriptions.userId, userId));
                }
                break;
            }

            case 'subscription.cancelled': {
                const userId = event.payload.subscription.entity.notes.userId;
                if (userId) {
                    await db.update(profiles)
                        .set({ plan: 'free' })
                        .where(eq(profiles.id, userId));

                    await db.update(subscriptions)
                        .set({ status: 'cancelled' })
                        .where(eq(subscriptions.userId, userId));
                }
                break;
            }

            case 'subscription.halted': {
                const userId = event.payload.subscription.entity.notes.userId;
                if (userId) {
                    await db.update(profiles)
                        .set({ plan: 'free' })
                        .where(eq(profiles.id, userId));

                    await db.update(subscriptions)
                        .set({ status: 'past_due' })
                        .where(eq(subscriptions.userId, userId));
                }
                break;
            }

            case 'payment.failed': {
                console.warn('Razorpay Payment Failed Handled Internally: ', event.payload.payment.entity.id);
                const subId = event.payload.payment.entity.subscription_id;
                if (subId) {
                    await db.update(subscriptions)
                        .set({ status: 'past_due' })
                        .where(eq(subscriptions.providerSubscriptionId, subId));
                }
                break;
            }

            default:
                break;
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Internal Server Error processing Webhook' }, { status: 500 });
    }
}
