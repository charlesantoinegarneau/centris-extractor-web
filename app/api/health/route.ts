import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    api: "healthy",
    extraction_service: "ready", 
    supported_formats: ["PDF"],
    max_file_size: "10MB",
    status: "Vercel API Route"
  });
}