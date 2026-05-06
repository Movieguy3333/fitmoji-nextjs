import { getPublishedVillageScreenshot } from "@/data/public-villages";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await context.params;
  const screenshot = await getPublishedVillageScreenshot(boardId);

  if (!screenshot) {
    return new Response("Village screenshot not found.", { status: 404 });
  }

  return new Response(new Uint8Array(screenshot.bytes), {
    headers: {
      "Cache-Control": screenshot.cacheControl,
      "Content-Type": screenshot.contentType,
    },
  });
}
