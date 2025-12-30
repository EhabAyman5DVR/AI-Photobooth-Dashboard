import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use an admin client here because API calls from the booth 
// usually won't have a user session.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // We'll need the user to add this to .env.local
);

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const amount = 1;

        // 1. Create a log entry
        const { error: logError } = await supabase
            .from('usage_logs')
            .insert([{ project_id: id, amount }]);

        if (logError) throw logError;

        // 2. Increment project total_usage using RPC
        const { error: updateError } = await supabase.rpc('increment_project_usage', {
            p_id: id,
            p_amount: amount
        });

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            projectId: id,
            incrementedBy: amount,
            timestamp: new Date().toISOString()
        }, { status: 200 });
    } catch (error: any) {
        console.error('API Generation Error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to increment generation count'
        }, { status: 500 });
    }
}
