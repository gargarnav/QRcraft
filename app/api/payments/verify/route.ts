import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { profiles, subscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan, billing } = body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid Payment Signature' }, { status: 403 });
        }

        // Update User Profile
        await db.update(profiles)
            .set({ plan: plan })
            .where(eq(profiles.id, userId));

        // Generate Expiration Base
        const periodEnd = new Date();
        if (billing === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Insert Subscription Tracker
        await db.insert(subscriptions).values({
            id: nanoid(),
            userId: userId,
            plan: plan,
            status: 'active',
            paymentProvider: 'razorpay',
            providerSubscriptionId: razorpay_subscription_id,
            currentPeriodEnd: periodEnd
        });

        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Subscription verify error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
