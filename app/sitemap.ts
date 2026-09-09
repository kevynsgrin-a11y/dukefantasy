import type { MetadataRoute } from "next";
import { coaches, conferenceHubSlugs, teams } from "@/lib/cfb-dataset";

/**
 * Detail routes are enumerated from the ESPN 2026 NFL dataset (32 teams and
 * their divisions) so the sitemap can never claim a page the data cannot
 * fill.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const teamRoutes: MetadataRoute.Sitemap = teams.map((team) => ({
    url: `/teams/${team.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));
  const coachRoutes: MetadataRoute.Sitemap = coaches.map((coach) => ({
    url: `/coaches/${coach.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));
  const conferenceRoutes: MetadataRoute.Sitemap = conferenceHubSlugs().map((slug) => ({
    url: `/conferences/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));
  const featureRoutes: MetadataRoute.Sitemap = [
    { url: "/x-and-ys", lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: "/injuries", lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];
  return [...teamRoutes, ...coachRoutes, ...conferenceRoutes, ...featureRoutes];
}
