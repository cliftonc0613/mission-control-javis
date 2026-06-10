import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://www.socialcrawl.dev/v1";

interface SocialStat {
  platform: string;
  handle: string;
  followers: number;
  posts: number;
  engagement: number; // percent
  live: boolean;
  error?: string;
}

const PLATFORMS: { platform: string; envHandle: string; demo: SocialStat }[] = [
  {
    platform: "instagram",
    envHandle: "SOCIAL_INSTAGRAM_HANDLE",
    demo: { platform: "instagram", handle: "demo", followers: 12480, posts: 342, engagement: 4.2, live: false },
  },
  {
    platform: "twitter",
    envHandle: "SOCIAL_TWITTER_HANDLE",
    demo: { platform: "twitter", handle: "demo", followers: 8932, posts: 1287, engagement: 2.8, live: false },
  },
  {
    platform: "linkedin",
    envHandle: "SOCIAL_LINKEDIN_HANDLE",
    demo: { platform: "linkedin", handle: "demo", followers: 5621, posts: 198, engagement: 6.1, live: false },
  },
  {
    platform: "facebook",
    envHandle: "SOCIAL_FACEBOOK_HANDLE",
    demo: { platform: "facebook", handle: "demo", followers: 3204, posts: 456, engagement: 1.9, live: false },
  },
];

// SocialCrawl response shapes vary per platform — pull counts defensively.
function pick(obj: Record<string, unknown> | undefined, keys: string[]): number {
  if (!obj) return 0;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

async function fetchProfile(
  platform: string,
  handle: string,
  apiKey: string
): Promise<SocialStat> {
  const res = await fetch(
    `${BASE}/${platform}/profile?handle=${encodeURIComponent(handle)}`,
    {
      headers: { "x-api-key": apiKey },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error(`${platform} HTTP ${res.status}`);
  }

  const json = (await res.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
  const data = (json.data ?? json) as Record<string, unknown>;
  const stats = (data.stats ?? data.statistics ?? data) as Record<string, unknown>;

  const followers = pick(stats, [
    "followers",
    "follower_count",
    "followerCount",
    "followers_count",
    "fan_count",
  ]);
  const posts = pick(stats, [
    "posts",
    "post_count",
    "postCount",
    "media_count",
    "tweet_count",
    "statuses_count",
  ]);
  const avgLikes = pick(stats, ["avg_likes", "average_likes", "avgLikes"]);
  const engagement =
    pick(stats, ["engagement_rate", "engagementRate"]) ||
    (followers > 0 && avgLikes > 0
      ? Math.round((avgLikes / followers) * 1000) / 10
      : 0);

  return { platform, handle, followers, posts, engagement, live: true };
}

export async function GET() {
  const apiKey = process.env.SOCIALCRAWL_API_KEY;

  const results = await Promise.all(
    PLATFORMS.map(async ({ platform, envHandle, demo }) => {
      const handle = process.env[envHandle];
      if (!apiKey || !handle) return demo;
      try {
        return await fetchProfile(platform, handle, apiKey);
      } catch (err) {
        return {
          ...demo,
          handle,
          error: err instanceof Error ? err.message : "fetch failed",
        };
      }
    })
  );

  return NextResponse.json({ configured: Boolean(apiKey), stats: results });
}
