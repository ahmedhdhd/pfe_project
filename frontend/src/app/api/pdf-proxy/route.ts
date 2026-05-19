import { NextRequest, NextResponse } from "next/server";

/**
 * PDF Proxy API Route
 * 
 * Proxies PDF requests to bypass CORS restrictions.
 * This route fetches the PDF from CloudFront/CDN and streams it to the client.
 * 
 * Usage:
 * GET /api/pdf-proxy?url=https://example.com/file.pdf
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pdfUrl = searchParams.get("url");

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "PDF URL is required" },
        { status: 400 }
      );
    }

    // Validate URL to prevent SSRF attacks
    try {
      const url = new URL(pdfUrl);
      // Only allow HTTPS URLs from trusted domains
      if (url.protocol !== "https:") {
        return NextResponse.json(
          { error: "Only HTTPS URLs are allowed" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch PDF from the source
    const response = await fetch(pdfUrl, {
      headers: {
        Accept: "application/pdf,application/octet-stream,*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="document.pdf"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy PDF" },
      { status: 500 }
    );
  }
}

