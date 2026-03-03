import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { plan, billing } = body;

        if (!plan || !billing) {
            return NextResponse.json({ error: 'Missing plan or billing parameters' }, { status: 400 });
        }

        if (plan === 'free' || plan === 'enterprise') {
            return NextResponse.json({ error: 'Invalid subscription target plan' }, { status: 400 });
        }

        let planId = '';
        if (plan === 'maker' && billing === 'monthly') {
            planId = process.env.RAZORPAY_MAKER_PLAN_ID_MONTHLY!;
        } else if (plan === 'maker' && billing === 'yearly') {
            planId = process.env.RAZORPAY_MAKER_PLAN_ID_YEARLY!;
        } else if (plan === 'pro' && billing === 'monthly') {
            planId = process.env.RAZORPAY_PRO_PLAN_ID_MONTHLY!;
        } else if (plan === 'pro' && billing === 'yearly') {
            planId = process.env.RAZORPAY_PRO_PLAN_ID_YEARLY!;
        } else {
            return NextResponse.json({ error: 'Unknown plan mapping' }, { status: 400 });
        }

        if (!planId) {
            return NextResponse.json({ error: 'Server configuration missing Plan ID' }, { status: 500 });
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            total_count: billing === 'yearly' ? 1 : 12,
            quantity: 1,
            notes: { userId, plan, billing }
        });

        return NextResponse.json({
            subscriptionId: subscription.id,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
