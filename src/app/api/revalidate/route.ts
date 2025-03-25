import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
    try {
        const { path } = await request.json();

        if (!path) {
            return NextResponse.json(
                { message: 'Missing path parameter' },
                { status: 400 }
            );
        }

        // Revalidate the specific path
        revalidatePath(path);

        return NextResponse.json(
            { revalidated: true, message: `Path ${path} revalidated successfully` }
        );
    } catch (error) {
        return NextResponse.json(
            { message: 'Error revalidating', error: (error as Error).message },
            { status: 500 }
        );
    }
} 
