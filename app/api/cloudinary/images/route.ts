
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const cloudName = searchParams.get('cloudName');
    const apiKey = searchParams.get('apiKey');
    const apiSecret = searchParams.get('apiSecret');
    const tag = searchParams.get('tag');

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
        // Try searching by tag first
        let result = await cloudinary.api.resources_by_tag(tag, {
            max_results: 50,
            context: true
        });

        // If no resources found by tag, try folder prefix search
        if (!result.resources || result.resources.length < 1) {
            result = await cloudinary.api.resources({
                type: 'upload',
                prefix: tag.endsWith('/') ? tag : `${tag}/`,
                max_results: 50,
                context: true
            });
        }

        return NextResponse.json({ resources: result.resources });
    } catch (error: any) {
        console.error('Cloudinary API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch images' }, { status: 500 });
    }
}
