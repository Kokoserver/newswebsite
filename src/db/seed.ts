import "dotenv/config";

import { sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/src/db/schema";
import {
  accounts,
  advertisements,
  advertisementAssignments,
  articleCategories,
  articleRevisions,
  articles,
  articleTags,
  articleViewDailyStats,
  articleViews,
  auditLogs,
  authenticators,
  categories,
  comments,
  homepageItems,
  homepageSections,
  media,
  navbarItems,
  newsletterSubscribers,
  sessions,
  siteEvents,
  tags,
  users,
  verificationTokens,
} from "@/src/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connection = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

const db = drizzle(connection, { schema });

const newsCategories = [
  ["News", "news", "Breaking stories, investigations and live updates."],
  ["Royals", "royals", "Royal family coverage, public appearances and palace analysis."],
  ["U.S.", "us", "Major U.S. headlines, politics, crime, courts and culture."],
  ["World", "world", "Global developments, diplomacy, conflict and international affairs."],
  ["Politics", "politics", "Policy, elections and decisions shaping daily life."],
  ["Showbiz", "showbiz", "Celebrity news, red carpets, television, film and entertainment."],
  ["Femail", "femail", "Lifestyle, relationships, fashion, beauty and real-life features."],
  ["Health", "health", "Medical news, wellness, research and practical health guidance."],
  ["Science", "science", "Space, technology, discovery, climate and scientific research."],
  ["Money", "money", "Personal finance, property, pensions, savings and consumer news."],
  ["Travel", "travel", "Holiday inspiration, airline news, hotels and destination guides."],
  ["Sport", "sport", "Major results, big events and personalities from global sport."],
] as const;

const staffUsers = [
  ["Daily Chronicle Admin", "admin@example.com", "SUPER_ADMIN"],
  ["Maya Fletcher", "maya.fletcher@example.com", "EDITOR"],
  ["Daniel Okafor", "daniel.okafor@example.com", "AUTHOR"],
  ["Priya Shah", "priya.shah@example.com", "AUTHOR"],
  ["Elliot Grant", "elliot.grant@example.com", "ADMIN"],
] as const;

const tagNames = [
  "Breaking News",
  "Exclusive",
  "Pictures",
  "Analysis",
  "Explainer",
  "Live Updates",
  "Consumer",
  "Health Advice",
  "Celebrity",
  "Property",
  "Travel Tips",
  "Technology",
] as const;

const headlineTemplates = [
  "Inside the late-night talks that changed everything",
  "Family's private meeting becomes the story everyone is discussing",
  "Pictures reveal the moment emergency crews arrived at the scene",
  "Experts warn readers to check this detail before the deadline",
  "A-list star breaks silence after viral interview divides fans",
  "The simple habit doctors say can transform your morning routine",
  "Homeowners brace for fresh squeeze as lenders update forecasts",
  "Royal watchers spot subtle gesture during public appearance",
  "Holiday destination introduces strict new rules for visitors",
  "Scientists explain the mystery behind a strange new discovery",
  "Shoppers race to buy budget item compared with designer favourite",
  "Parents divided after policy change is announced before holidays",
] as const;

const videoEntries = [
  ["Morning News Briefing", "morning-news-briefing", "The essential morning headlines, picked and explained in minutes."],
  ["Showbiz Interview", "showbiz-interview", "A-list star opens up in an exclusive one-on-one interview."],
  ["Royal Report", "royal-report", "Palace insiders on the planning behind a major public reset."],
  ["Money Matters", "money-matters", "Mortgage rates and household budgets explained."],
  ["Health Check", "health-check", "The simple habit doctors say can improve your sleep."],
  ["Sport Highlights", "sport-highlights", "The goals, drama and talking points from the weekend."],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sampleImageUrl(seed: string, width = 1200, height = 760) {
  return `https://picsum.photos/seed/daily-chronicle-${seed}/${width}/${height}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function articleBody(title: string, category: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        text: `${title}. This demo story belongs to ${category} and is seeded for local previews.`,
      },
      {
        type: "paragraph",
        text: "Editors can replace this structured content with TipTap JSON from the newsroom workflow.",
      },
    ],
  };
}

async function clearDemoData(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  await tx.delete(siteEvents);
  await tx.delete(auditLogs);
  await tx.delete(articleViewDailyStats);
  await tx.delete(articleViews);
  await tx.delete(comments);
  await tx.delete(advertisementAssignments);
  await tx.delete(advertisements);
  await tx.delete(homepageItems);
  await tx.delete(articleTags);
  await tx.delete(articleCategories);
  await tx.delete(articleRevisions);
  await tx.delete(articles).where(sql`${articles.sourceName} = 'Daily Chronicle Demo'`);
  await tx.delete(navbarItems);
  await tx.delete(tags).where(sql`${tags.slug} LIKE 'demo-%'`);
  await tx.delete(media).where(sql`${media.bunnyPath} LIKE 'demo/%'`);
  await tx.delete(homepageSections);
  await tx.delete(authenticators).where(sql`${authenticators.providerAccountId} LIKE 'demo-%'`);
  await tx.delete(accounts).where(sql`${accounts.provider} = 'demo'`);
  await tx.delete(sessions).where(sql`${sessions.sessionToken} LIKE 'demo-session-%'`);
  await tx.delete(verificationTokens).where(sql`${verificationTokens.identifier} = 'demo@example.com'`);
}

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-locally";
  const hashedPassword = await hash(adminPassword, 12);

  const result = await db.transaction(async (tx) => {
    await clearDemoData(tx);

    const seededUsers = [];

    for (const [name, email, role] of staffUsers) {
      const [user] = await tx
        .insert(users)
        .values({
          name,
          email: email === "admin@example.com" ? adminEmail : email,
          passwordHash: hashedPassword,
          role,
          status: "ACTIVE",
          emailVerified: new Date(),
          image: sampleImageUrl(slugify(name), 240, 240),
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name,
            passwordHash: hashedPassword,
            role,
            status: "ACTIVE",
            emailVerified: new Date(),
            image: sampleImageUrl(slugify(name), 240, 240),
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

      seededUsers.push(user);
    }

    const admin = seededUsers[0];
    const editor = seededUsers[1];
    const authors = seededUsers.slice(2);

    await tx.insert(accounts).values(
      seededUsers.map((user) => ({
        userId: user.id,
        type: "credentials",
        provider: "demo",
        providerAccountId: `demo-${user.email}`,
        scope: "demo",
      })),
    );

    await tx.insert(sessions).values(
      seededUsers.slice(0, 2).map((user, index) => ({
        sessionToken: `demo-session-${index + 1}`,
        userId: user.id,
        expires: daysAgo(-14),
      })),
    );

    await tx.insert(verificationTokens).values({
      identifier: "demo@example.com",
      token: "demo-verification-token",
      expires: daysAgo(-2),
    });

    await tx.insert(authenticators).values({
      credentialID: "demo-passkey-credential",
      userId: admin.id,
      providerAccountId: "demo-passkey-admin",
      credentialPublicKey: "demo-public-key",
      counter: 1,
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
      transports: "internal",
    });

    const seededCategories = [];

    for (const [index, [name, slug, description]] of newsCategories.entries()) {
      const [category] = await tx
        .insert(categories)
        .values({
          name,
          slug,
          description,
          position: index + 1,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            name,
            description,
            position: index + 1,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          position: categories.position,
        });

      seededCategories.push(category);

      await tx
        .insert(navbarItems)
        .values({
          categoryId: category.id,
          label: name,
          href: `/section/${slug}`,
          position: index + 1,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: navbarItems.categoryId,
          set: {
            label: name,
            href: `/section/${slug}`,
            position: index + 1,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }

    const categoryBySlug = new Map(seededCategories.map((category) => [category.slug, category]));

    const seededTags = await tx
      .insert(tags)
      .values(
        tagNames.map((name) => ({
          name,
          slug: `demo-${slugify(name)}`,
        })),
      )
      .returning({ id: tags.id, name: tags.name, slug: tags.slug });

    const imageRows = [];

    for (const category of seededCategories) {
      for (let index = 1; index <= 5; index += 1) {
        imageRows.push({
          kind: "IMAGE" as const,
          title: `${category.name} demo image ${index}`,
          altText: `${category.name} sample news photograph ${index}`,
          caption: `Sample ${category.name} image from the demo media library.`,
          bunnyPath: `demo/${category.slug}/image-${index}.jpg`,
          publicUrl: sampleImageUrl(`${category.slug}-${index}`),
          mimeType: "image/jpeg",
          byteSize: 245_000 + index * 10_000,
          width: 1200,
          height: 760,
          metadata: {
            provider: "picsum",
            demo: true,
            category: category.slug,
          },
          uploadedById: editor.id,
        });
      }
    }

    imageRows.push({
      kind: "IMAGE" as const,
      title: "Homepage billboard advert",
      altText: "Demo advertisement creative",
      caption: "Demo advertising image.",
      bunnyPath: "demo/ads/homepage-billboard.jpg",
      publicUrl: sampleImageUrl("ad-homepage", 1200, 320),
      mimeType: "image/jpeg",
      byteSize: 180_000,
      width: 1200,
      height: 320,
      metadata: { provider: "picsum", demo: true, slot: "HOMEPAGE_TOP" },
      uploadedById: editor.id,
    });

    for (const [videoTitle, videoSlug, videoCaption] of videoEntries) {
      imageRows.push({
        kind: "VIDEO" as const,
        title: videoTitle,
        slug: videoSlug,
        altText: videoCaption,
        caption: videoCaption,
        bunnyPath: `demo/video/${videoSlug}.mp4`,
        publicUrl: sampleImageUrl(`video-${videoSlug}`, 1280, 720),
        mimeType: "video/mp4",
        byteSize: 4_500_000,
        width: 1280,
        height: 720,
        metadata: { provider: "picsum-poster", demo: true },
        uploadedById: editor.id,
      });
    }

    const seededMedia = await tx
      .insert(media)
      .values(imageRows)
      .returning({
        id: media.id,
        title: media.title,
        caption: media.caption,
        bunnyPath: media.bunnyPath,
        publicUrl: media.publicUrl,
      });

    const mediaByPath = new Map(seededMedia.map((item) => [item.bunnyPath, item]));

    const articleRows = [];

    for (const [categoryIndex, category] of seededCategories.entries()) {
      for (let index = 0; index < 4; index += 1) {
        const template = headlineTemplates[(categoryIndex + index) % headlineTemplates.length];
        const isLegacyMostReadLink = category.slug === "news" && index === 0;
        const isLegacyHomepageLink = category.slug === "news" && index === 1;
        const title = isLegacyMostReadLink
          ? "Inheritance row exposes bitter split between relatives"
          : isLegacyHomepageLink
            ? "Family reveals dramatic final hours before landmark public appearance"
          : `${template} in ${category.name}`;
        const slug = isLegacyMostReadLink
          ? "inheritance-row-exposes-bitter-split-between-relatives"
          : isLegacyHomepageLink
            ? "family-reveals-dramatic-final-hours-before-landmark-public-appearance"
          : `${category.slug}-${slugify(template)}-${index + 1}`;
        const publishedAt = daysAgo(categoryIndex + index);
        const author = authors[(categoryIndex + index) % authors.length];
        const heroImage = mediaByPath.get(`demo/${category.slug}/image-${(index % 5) + 1}.jpg`);

        articleRows.push({
          title,
          slug,
          subtitle: `${category.name} desk analysis and live reaction`,
          excerpt: `A demo ${category.name.toLowerCase()} story with images, metadata, comments and analytics.`,
          content: articleBody(title, category.name),
          renderedContent: `<p>${title}</p><p>This seeded article is ready for demo previews and category archives.</p>`,
          status: "PUBLISHED" as const,
          type: index === 0 ? ("BREAKING" as const) : index === 1 ? ("ANALYSIS" as const) : ("STANDARD" as const),
          authorId: author.id,
          heroImageId: heroImage?.id,
          mobileHeroImageId: heroImage?.id,
          socialImageId: heroImage?.id,
          seoTitle: title.slice(0, 70),
          seoDescription: `Demo ${category.name} article for Daily Chronicle.`,
          sourceName: "Daily Chronicle Demo",
          sourceUrl: `https://example.com/demo/${slug}`,
          isFeatured: index === 0,
          allowComments: true,
          readingMinutes: 3 + index,
          viewCount: 2500 - categoryIndex * 95 - index * 31,
          publishedAt,
          createdAt: publishedAt,
          updatedAt: new Date(),
        });
      }
    }

    const seededArticles = await tx
      .insert(articles)
      .values(articleRows)
      .returning({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        authorId: articles.authorId,
        heroImageId: articles.heroImageId,
        publishedAt: articles.publishedAt,
      });

    const articleBySlug = new Map(seededArticles.map((article) => [article.slug, article]));

    const articleCategoryRows = [];
    const articleTagRows = [];
    const revisionRows = [];
    const commentRows = [];
    const viewRows = [];
    const statRows = [];
    const auditRows = [];

    for (const [index, article] of seededArticles.entries()) {
      const category = seededCategories[Math.floor(index / 4)];
      const fallbackCategory = categoryBySlug.get("news");

      articleCategoryRows.push({
        articleId: article.id,
        categoryId: category.id,
        isPrimary: true,
      });

      if (fallbackCategory && fallbackCategory.id !== category.id) {
        articleCategoryRows.push({
          articleId: article.id,
          categoryId: fallbackCategory.id,
          isPrimary: false,
        });
      }

      for (const tag of [seededTags[index % seededTags.length], seededTags[(index + 3) % seededTags.length]]) {
        articleTagRows.push({
          articleId: article.id,
          tagId: tag.id,
        });
      }

      revisionRows.push({
        articleId: article.id,
        editorId: editor.id,
        title: article.title,
        content: articleBody(article.title, category.name),
        createdAt: daysAgo(index % 5),
      });

      if (index < 24) {
        commentRows.push(
          {
            articleId: article.id,
            authorName: "CityReader",
            authorEmail: `reader-${index}-a@example.com`,
            body: "This is a useful summary for the demo. The timeline makes the story easier to follow.",
            status: "APPROVED" as const,
            moderatedById: editor.id,
            moderatedAt: new Date(),
            createdAt: daysAgo(index % 4),
          },
          {
            articleId: article.id,
            authorName: "NewsWatcher",
            authorEmail: `reader-${index}-b@example.com`,
            body: "The pictures and background context make this ready for a presentation.",
            status: index % 5 === 0 ? ("PENDING" as const) : ("APPROVED" as const),
            moderatedById: index % 5 === 0 ? undefined : editor.id,
            moderatedAt: index % 5 === 0 ? undefined : new Date(),
            createdAt: daysAgo(index % 3),
          },
        );
      }

      for (let viewIndex = 0; viewIndex < 3; viewIndex += 1) {
        viewRows.push({
          articleId: article.id,
          visitorHash: `demo-visitor-${index}-${viewIndex}`,
          referrer: viewIndex % 2 === 0 ? "https://www.google.com/" : "https://www.facebook.com/",
          userAgent: "DemoBrowser/1.0",
          viewedAt: daysAgo(viewIndex),
        });
      }

      statRows.push({
        articleId: article.id,
        day: formatDay(daysAgo(0)),
        views: 100 + index * 7,
        uniqueVisitors: 60 + index * 3,
      });

      auditRows.push({
        actorId: editor.id,
        articleId: article.id,
        action: "PUBLISH" as const,
        entityType: "article",
        entityId: article.id,
        summary: `Published demo article: ${article.title}`,
        metadata: { demo: true, category: category.slug },
        createdAt: article.publishedAt ?? new Date(),
      });
    }

    await tx.insert(articleCategories).values(articleCategoryRows);
    await tx.insert(articleTags).values(articleTagRows);
    await tx.insert(articleRevisions).values(revisionRows);
    await tx.insert(comments).values(commentRows);
    await tx.insert(articleViews).values(viewRows);
    await tx.insert(articleViewDailyStats).values(statRows);
    await tx.insert(auditLogs).values(auditRows);

    const sectionRows: Array<{
      key: string;
      title: string;
      kind: "HERO" | "LATEST" | "FEATURED" | "CATEGORY" | "OPINION" | "VIDEO" | "ADVERTISEMENT";
      position: number;
    }> = [
      { key: "hero", title: "Top Stories", kind: "HERO", position: 1 },
      { key: "latest", title: "Latest", kind: "LATEST", position: 2 },
      { key: "featured", title: "Featured", kind: "FEATURED", position: 3 },
    ];

    let sectionPosition = sectionRows.length + 1;

    for (const category of seededCategories) {
      sectionRows.push({
        key: category.slug,
        title: category.name,
        kind: "CATEGORY",
        position: sectionPosition,
      });
      sectionPosition += 1;
    }

    sectionRows.push(
      { key: "video", title: "Watch", kind: "VIDEO", position: sectionPosition },
      { key: "opinion", title: "Opinion", kind: "OPINION", position: sectionPosition + 1 },
    );

    const seededSections = await tx
      .insert(homepageSections)
      .values(sectionRows)
      .returning({
        id: homepageSections.id,
        key: homepageSections.key,
      });

    const sectionByKey = new Map(seededSections.map((section) => [section.key, section]));
    const homepageRows = [];

    const homepageConfig: Array<[string, Array<(typeof seededArticles)[number]>]> = [];

    for (let categoryIndex = 0; categoryIndex < seededCategories.length; categoryIndex += 1) {
      const category = seededCategories[categoryIndex];
      homepageConfig.push([
        category.slug,
        seededArticles.slice(categoryIndex * 4, categoryIndex * 4 + 4),
      ]);
    }

    homepageConfig.unshift(
      ["hero", seededArticles.slice(0, 5)],
      ["latest", seededArticles.slice(5, 13)],
      ["featured", seededArticles.filter((_, index) => index % 4 === 0).slice(0, 8)],
    );

    homepageConfig.push(["opinion", seededArticles.slice(16, 20)]);

    for (const [sectionKey, sectionArticles] of homepageConfig) {
      const section = sectionByKey.get(sectionKey);

      if (!section) {
        continue;
      }

      for (const [position, article] of sectionArticles.entries()) {
        homepageRows.push({
          sectionId: section.id,
          articleId: article.id,
          mediaId: article.heroImageId,
          position: position + 1,
          titleOverride: position === 0 ? article.title : undefined,
          dekOverride: position === 0 ? "Demo curated homepage slot." : undefined,
        });
      }
    }

    const videoSection = sectionByKey.get("video");
    const videoMediaRows = seededMedia.filter((item) => item.bunnyPath.startsWith("demo/video/"));

    if (videoSection) {
      for (const [position, video] of videoMediaRows.entries()) {
        homepageRows.push({
          sectionId: videoSection.id,
          mediaId: video.id,
          position: position + 1,
          titleOverride: video.title,
          dekOverride: video.caption,
        });
      }
    }

    await tx.insert(homepageItems).values(homepageRows);

    const adMedia = mediaByPath.get("demo/ads/homepage-billboard.jpg");
    const seededAds = await tx
      .insert(advertisements)
      .values([
        {
          name: "Demo Homepage Billboard",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/homepage-billboard",
          mediaId: adMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Article Sidebar",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/article-sidebar",
          mediaId: adMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Category Top",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/category-top",
          mediaId: adMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
      ])
      .returning({ id: advertisements.id, name: advertisements.name });

    await tx.insert(advertisementAssignments).values([
      {
        advertisementId: seededAds[0].id,
        slot: "HOMEPAGE_TOP",
        position: 1,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
      {
        advertisementId: seededAds[1].id,
        slot: "ARTICLE_SIDEBAR",
        articleId: seededArticles[0].id,
        position: 1,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
      {
        advertisementId: seededAds[2].id,
        slot: "CATEGORY_TOP",
        position: 1,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
    ]);

    await tx
      .insert(newsletterSubscribers)
      .values([
        {
          email: "reader@example.com",
          status: "ACTIVE",
          confirmedAt: new Date(),
        },
        {
          email: "digest@example.com",
          status: "ACTIVE",
          confirmedAt: daysAgo(2),
        },
        {
          email: "pending@example.com",
          status: "PENDING",
        },
        {
          email: "unsubscribed@example.com",
          status: "UNSUBSCRIBED",
          confirmedAt: daysAgo(20),
          unsubscribedAt: daysAgo(1),
        },
      ])
      .onConflictDoNothing();

    await tx.insert(siteEvents).values([
      {
        name: "demo_seed_completed",
        payload: JSON.stringify({
          articles: seededArticles.length,
          categories: seededCategories.length,
          media: seededMedia.length,
        }),
      },
      {
        name: "homepage_view",
        payload: JSON.stringify({ demo: true, source: "seed" }),
      },
    ]);

    const topArticle = articleBySlug.get(seededArticles[0].slug);

    return {
      users: seededUsers.length,
      categories: seededCategories.length,
      navbarItems: seededCategories.length,
      tags: seededTags.length,
      media: seededMedia.length,
      articles: seededArticles.length,
      homepageItems: homepageRows.length,
      comments: commentRows.length,
      topArticle: topArticle?.slug,
    };
  });

  console.log("Demo seed completed", result);
}

seed()
  .catch((error) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await connection.end();
  });
