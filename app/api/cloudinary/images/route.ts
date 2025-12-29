
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const cloudName = searchParams.get('cloudName');
    const apiKey = searchParams.get('apiKey');
    const apiSecret = searchParams.get('apiSecret');
    const tag = searchParams.get('tag');
    const nextCursor = searchParams.get('next_cursor');

    if (!cloudName || !apiKey || !apiSecret || !tag) {
        return NextResponse.json({ error: 'Missing Cloudinary configuration' }, { status: 400 });
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    try {
        // Use Search API for explicit newest-first sorting (created_at descending)
        // This covers both folder prefix and tag matching in one query
        // Excludes images in the 'qr-codes' subfolder
        const result = await cloudinary.search
            .expression(`(tags:"${tag}" OR folder:"${tag}/*") AND NOT folder:"${tag}/qr-codes/*"`)
            .sort_by('created_at', 'desc')
            .max_results(24)
            .next_cursor(nextCursor || undefined)
            .execute();

        return NextResponse.json({
            resources: result.resources,
            next_cursor: result.next_cursor
        });
    } catch (error: any) {
        console.error('Cloudinary API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch images' }, { status: 500 });
    }
}
