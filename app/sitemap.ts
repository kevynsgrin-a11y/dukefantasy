import type { MetadataRoute } from "next";
import { environment } from "@/lib/config";
import { coaches, conferenceHubSlugs, teams } from "@/lib/cfb-dataset";

/**
 * Detail routes are enumerated from the ESPN 2026 NFL dataset (32 teams and
 * their divisions) so the sitemap can never claim a page the data cannot
 * fill. URLs are absolutized against the production origin — the sitemap
 * spec requires absolute <loc> values, and root-relative ones showed up as
 * GSC errors while the site sat on a stale build (2026-09-22 audit).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = environment.siteUrl;
  const now = new Date();
  const teamRoutes: MetadataRoute.Sitemap = teams.map((team) => ({
    url: `${origin}/teams/${team.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const coachRoutes: MetadataRoute.Sitemap = coaches.map((coach) => ({
    url: `${origin}/coaches/${coach.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));
  const conferenceRoutes: MetadataRoute.Sitemap = conferenceHubSlugs().map((slug) => ({
    url: `${origin}/conferences/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const featureRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/x-and-ys`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${origin}/injuries`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/fantasy-desk`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
  return [...teamRoutes, ...coachRoutes, ...conferenceRoutes, ...featureRoutes];
}
