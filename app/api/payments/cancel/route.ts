import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { razorpay } from '@/lib/razorpay'

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const activeSub = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, 'active'),
                eq(subscriptions.paymentProvider, 'razorpay')
            )
        });

        if (!activeSub || !activeSub.providerSubscriptionId) {
            return NextResponse.json({ error: 'No active subscription found to cancel' }, { status: 404 });
        }

        await razorpay.subscriptions.cancel(activeSub.providerSubscriptionId, true);

        await db.update(subscriptions)
            .set({ status: 'cancelled' })
            .where(eq(subscriptions.id, activeSub.id));

        return NextResponse.json({ success: true, message: 'Subscription cancelled. Access continues until end of billing period.' });

    } catch (error) {
        console.error('Subscription cancellation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
