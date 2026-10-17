import { redirect } from "next/navigation";

export default async function ArcadeRadicalConfluenceRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const params = await searchParams;
  const seed = params.seed ?? "";
  const url = seed ? `/games/radical-confluence?seed=${seed}` : "/games/radical-confluence";
  redirect(url);
}
