import "dotenv/config";

import { createClient } from "@libsql/client";
import { inArray, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "@/src/db/schema";
import { ensureFileDatabaseDirectory, getDatabaseConfig } from "@/src/db/config";
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

const databaseConfig = getDatabaseConfig();
ensureFileDatabaseDirectory(databaseConfig.url);

const connection = createClient({
  url: databaseConfig.url,
  authToken: databaseConfig.authToken,
});

const db = drizzle(connection, { schema });

const newsCategories = [
  ["News", "news", "Breaking stories, investigations and live updates from the global newsroom."],
  ["UK", "uk", "British politics, communities, business, culture and diaspora life."],
  ["USA", "usa", "American politics, culture, courts, business and diaspora stories."],
  ["Nigeria", "nigeria", "National news, politics, business, culture and public life from Nigeria."],
  ["Ghana", "ghana", "Ghanaian news, politics, business, entertainment and society."],
  ["Africa", "africa", "Continental politics, enterprise, innovation, culture and human stories."],
  ["World", "world", "Global developments, diplomacy, conflict and international affairs."],
  ["Business", "business", "Markets, companies, entrepreneurs, money and the commercial world."],
  ["Politics", "politics", "Power, elections, policy and decisions shaping public life."],
  ["Entertainment", "entertainment", "Film, music, television, celebrity, culture and creative industries."],
  ["Sport", "sport", "Major results, big events and personalities from global sport."],
  ["Lifestyle", "lifestyle", "Health, travel, fashion, property, family and everyday living."],
] as const;

const legacyCategorySlugs = [
  "royals",
  "us",
  "showbiz",
  "femail",
  "health",
  "science",
  "money",
  "travel",
] as const;

const staffUsers = [
  ["THE WORLD CURRENT Editor", "admin@example.com", "SUPER_ADMIN"],
  ["Maya Fletcher", "maya.fletcher@example.com", "EDITOR"],
  ["Daniel Okafor", "daniel.okafor@example.com", "AUTHOR"],
  ["Ama Mensah", "ama.mensah@example.com", "AUTHOR"],
  ["Elliot Grant", "elliot.grant@example.com", "ADMIN"],
] as const;

const tagNames = [
  "Breaking News",
  "Exclusive",
  "Analysis",
  "Opinion",
  "Interview",
  "Explainer",
  "Live Updates",
  "Diaspora",
  "Africa Rising",
  "Technology & AI",
  "Culture",
  "Business",
  "Human Interest",
] as const;

const categoryHeadlines: Record<string, string[]> = {
  news: [
    "Breaking: Global leaders agree fresh diplomatic talks in the coming weeks",
    "Live updates as world powers respond to the latest international crisis",
    "Explainer: What the new global security pact means for ordinary readers",
    "Exclusive: Inside the negotiations reshaping cross-border policy",
    "Investigations desk: How key decisions reached the public this week",
    "Diaspora summit opens as delegates map out a shared agenda for change",
    "Global newsroom briefing: five stories shaping the world today",
    "Analysis: The forces driving the biggest headlines of the week",
    "Press conferences and pledges: a round-up of a decisive news week",
    "In depth: The story behind the story dominating world coverage",
    "Fact-checking the claims making the rounds across social media",
    "What we know so far as events unfold around the world today",
  ],
  uk: [
    "UK ministers face questions after new domestic policy announcement",
    "British high streets see a shift in how shoppers and businesses adapt",
    "Local councils warn over public services funding pressures this year",
    "Diaspora communities across Britain mark a week of cultural events",
    "London transit upgrade brings fresh plans for commuters and businesses",
    "UK housing market data shows how families are responding to prices",
    "Scottish and Welsh leaders weigh in on a sensitive national debate",
    "British universities and startups race to keep talent at home",
    "A landmark court ruling that could reshape everyday life in Britain",
    "Garden cities and green belts: the planning row dividing opinion",
    "UK exporters look abroad as trade deals open up new opportunities",
    "Inside the British cultural calendar drawing crowds this season",
  ],
  usa: [
    "US politics: primaries heat up as candidates set out their platforms",
    "American courts deliver a decision that will echo for years",
    "Midwest manufacturing towns pin hopes on new federal investment",
    "US border and port cities confront shifted trade and migration flows",
    "Healthcare debate returns to Congress as premiums rise again",
    "Wall Street reacts to the latest jobs and inflation snapshot",
    "California tech hubs and Texas startups eye a changing landscape",
    "America's diaspora and immigrant stories take centre stage this week",
    "Midterm signals: what local results could mean for the White House",
    "US infrastructure bill brings road and rail projects to reality",
    "Campus life and cost-of-living concerns shape young American voters",
    "A climate accord test for American businesses and households",
  ],
  nigeria: [
    "Nigeria's finance ministry unveils new plans to stabilise the naira",
    "Lagos entrepreneurs expand as Afrobeats and tech draw global money",
    "Nigerian farmers and exporters welcome renewed trade agreements",
    "Abuja responds to power grid reforms sparking both hope and debate",
    "Education push: states commit to reopening and rebuilding classrooms",
    "Nollywood's global moment as streaming giants back local productions",
    "Youth unemployment data prompts new job-creation pledges in Nigeria",
    "Oil-producing regions weigh the economics of the energy transition",
    "Election season begins as parties pick candidates and set agendas",
    "Healthcare workers call for investment as services come under strain",
    "Northern and coastal states see infrastructure spending announced",
    "Diaspora remittances rise, supporting families and small businesses",
  ],
  ghana: [
    "Ghana's cocoa sector eyes premium prices as global demand grows",
    "Accra's tech scene draws international founders and venture capital",
    "Gold Coast economy: new figures show how households are coping",
    "Ghanaian filmmakers win international audiences with homegrown stories",
    "Asante and coastal communities celebrate a season of festivals",
    "Ghana's ports expand to handle rising regional trade volumes",
    "Education reform plan unveiled for schools across the country",
    "Health ministry launches drive to expand rural clinic coverage",
    "Ghana's music stars top charts as the industry goes global",
    "Tourism push aims to draw visitors to castles, beaches and parks",
    "Farmers and agro-processors back new rice and yam value chains",
    "Civil society questions spending priorities ahead of budget season",
  ],
  africa: [
    "Africa's free trade area moves to a new phase of implementation",
    "Continental leaders meet to coordinate response to climate shocks",
    "African startups reach record funding in the latest investment round",
    "East African drought response draws aid pledges from abroad",
    "Rail and port corridor projects aim to boost cross-border commerce",
    "Pan-African culture: music and film travel further than ever",
    "African central banks weigh inflation amid global rate pressure",
    "Digital identity pushes promise wider access to banking and health",
    "Renewables drive: solar projects light up villages across the continent",
    "African Union peacekeeping decisions come under fresh scrutiny",
    "Young innovators tackle food, water and energy across the region",
    "Diaspora investors target home-grown infrastructure and property",
  ],
  world: [
    "World diplomacy: summit drafts a new declaration on cooperation",
    "Global markets open cautiously as central banks weigh rate moves",
    "Conflicts abroad raise humanitarian concerns for aid agencies",
    "Climate summit sets fresh targets that divide rich and poor nations",
    "European capitals weigh response to shifting energy and trade ties",
    "Asia-Pacific leaders agree a framework for cross-border commerce",
    "Latin America election wave reaches a defining weekend",
    "Middle East peace efforts resume after a fraught diplomatic round",
    "Global food prices ease but supply chain worries persist",
    "United Nations agencies call for funding to meet urgent needs",
    "World Bank forecasts a modest recovery for emerging economies",
    "International courts deliver rulings with far-reaching consequences",
  ],
  business: [
    "Business analysis: how companies are navigating higher borrowing costs",
    "Tech IPOs return as venture markets show signs of a revival",
    "Retailers adapt store networks as online spending settles",
    "Small business owners share their outlook on costs and demand",
    "Banks and fintechs compete for a new generation of customers",
    "Supply chain shifts see manufacturers move production closer to home",
    "Energy firms face pressure to show low-carbon transition plans",
    "Startups in fintech and clean energy lead the latest funding round",
    "Workplace trends: hybrid roles and pay transparency take hold",
    "Property markets cool as mortgage rates begin to bite",
    "Airlines and tourism operators bet on a strong travel season",
    "Stock market week ahead: what investors are watching closely",
  ],
  politics: [
    "Political analysis: the decisions and divisions shaping the agenda",
    "Coalition talks intensify as parties search for a governing majority",
    "Parliament debates clamping down on lobbying and campaign finance",
    "Policy explainer: what the latest reform really changes",
    "State and local leaders push back against central government plans",
    "Election watch: polls, promises and the issues voters prioritise",
    "Ministers outline a new approach to public spending reviews",
    "Opposition parties set out alternative plans before the next vote",
    "Judicial decisions could upend a contested legislative agenda",
    "Backbench revolt forces a rethink over a controversial bill",
    "International politics: how foreign policy is playing at home",
    "Political parties court the young and the diaspora vote",
  ],
  entertainment: [
    "Entertainment: the box office hits and streaming sensations of the week",
    "Award season builds as film and music nominations are unveiled",
    "Celebrity interviews and the stories behind the headlines",
    "Afrobeats and diaspora acts headline major international festivals",
    "Hollywood and Nollywood explore new co-productions",
    "Concerts and tours return as audiences get back to live shows",
    "TV and film reviews: what critics and fans are saying this week",
    "Music chart round-up: the tracks climbing the global charts",
    "Backstage at fashion week: stars and designers on the red carpet",
    "Streaming wars: the biggest new releases vying for attention",
    "Documentaries, podcasts and books capturing the cultural moment",
    "Celebrity charity and public life under the spotlight",
  ],
  sport: [
    "Sport: the results, upsets and dramas from a packed fixture week",
    "Football round-up: title races and European nights heat up",
    "Athletics stars chase records at a landmark championship",
    "Cricket and rugby: the big series making the headlines",
    "Basketball and boxing bring crowd favourites back to the arena",
    "Olympic and Commonwealth athletes set their sights on new goals",
    "Transfer news and contract sagas dominating the back pages",
    "Coaches explain the tactics behind a surprising run of form",
    "National teams announce squads ahead of crucial qualifiers",
    "Women's sport continues its record-breaking growth spurt",
    "Grassroots clubs worry about funding and facilities",
    "Sports science and injuries shaping the modern game",
  ],
  lifestyle: [
    "Lifestyle: the wellness, health and everyday trends experts highlight",
    "Travel desk picks the destinations and escapes worth your time",
    "Home and property: how families are decorating on a budget",
    "Family and relationships advice from the people who live it",
    "Healthy eating: recipes and food ideas for busy weeks",
    "Work-life balance and wellbeing in a changing world",
    "Fashion and beauty trends crossing continents this season",
    "Gardens, interiors and the joy of slow living",
    "Parenthood and education: practical guidance for home life",
    "Money management and saving tips for ordinary households",
    "Weekend culture: books, walks, film and food to enjoy",
    "Community features celebrating people and places nearby",
  ],
};

const articlesPerCategory = 60;

const videoEntries = [
  ["The World Current Briefing", "world-current-briefing", "The essential global headlines, picked and explained in minutes."],
  ["Africa Business Interview", "africa-business-interview", "A founder explains how African enterprise is reaching global markets."],
  ["Diaspora Report", "diaspora-report", "Stories connecting London, Lagos, Accra, New York and beyond."],
  ["Politics Live", "politics-live", "The decisions, debates and election signals shaping public life."],
  ["Culture Current", "culture-current", "Music, film, fashion and ideas moving between continents."],
  ["Sport Highlights", "sport-highlights", "The results, drama and talking points from global sport."],
  ["Breaking: World Security Summit", "breaking-world-security-summit", "Leaders gather in London for emergency talks on the new security pact."],
  ["Nigeria Tech Boom Explained", "nigeria-tech-boom-explained", "How Lagos startups are pulling in global investors and talent."],
  ["Ghana Election Watch", "ghana-election-watch", "Candidates, campaigns and the issues voters say matter most."],
  ["Markets This Week", "markets-this-week", "Our business desk looks at the trading week ahead and what it means."],
  ["Inside the Immigration Courts", "inside-the-immigration-courts", "A closer look at the cases shaping lives across the diaspora."],
  ["The Climate Divide", "the-climate-divide", "How richer and poorer nations see the fight against climate change."],
  ["Household Budgets", "household-budgets", "Real families share how they are coping with the cost of living."],
  ["On the Air with Afrobeats", "on-the-air-with-afrobeats", "The artists and producers taking the sound around the world."],
  ["Rural Health Clinics", "rural-health-clinics", "New clinics aim to bring care closer to remote communities."],
  ["The Property Puzzle", "the-property-puzzle", "Why housing is getting harder to afford in major cities."],
  ["Coffee to Cup", "coffee-to-cup", "Tracing East African coffee from farm to breakfast table."],
  ["Tracking the Nomads", "tracking-the-nomads", "How traditional herding communities are adapting to a changing climate."],
  ["Women in Politics", "women-in-politics", "The female leaders shaking up the electoral landscape."],
  ["The Port Expansion", "the-port-expansion", "A new shipping terminal promises to transform regional trade."],
  ["Tech for Schools", "tech-for-schools", "Digital classrooms arrive in classrooms that never had them."],
  ["The Film Fest Diaries", "film-fest-diaries", "Behind the scenes at the continent's biggest film festival."],
  ["Savings, Loans and Hope", "savings-loans-and-hope", "Community finance is helping small businesses get off the ground."],
  ["The Olympic Dream", "the-olympic-dream", "Rising athletes measure the road to the big stage."],
  ["Urban Gardens", "urban-gardens", "City farming is feeding families and greening neighbourhoods."],
  ["The Tourism Comeback", "the-tourism-comeback", "Coastal towns welcome visitors back for a bumper season."],
  ["Football Academies", "football-academies", "Grassroots training grounds hope to produce the next generation."],
  ["Money Trail: Remittances", "money-trail-remittances", "The billion-dollar flows that keep diaspora families connected."],
  ["New Music, Old Roots", "new-music-old-roots", "Modern producers are rediscovering traditional instruments."],
  ["The Railway Renaissance", "the-railway-renaissance", "Faster, cleaner trains aim to reconnect towns and cities."],
  ["Inside the Newsroom", "inside-the-newsroom", "How a story travels from breaking alert to the front page."],
  ["Cooking with the Grandmothers", "cooking-with-the-grandmothers", "Recipes and memories passed down through generations."],
  ["The Price of Power", "the-price-of-power", "Examining the cost of keeping the lights on at home and in business."],
  ["Diaspora Returns", "diaspora-returns", "Why a growing number are moving back to invest and build."],
  ["The Startup Garage", "startup-garage", "Young founders pitch ideas to fix everyday problems."],
  ["World Cup Road Trip", "world-cup-road-trip", "Fans, flags and fixtures as qualifying reaches the final hurdle."],
  ["A Vaccine Changed Lives Here", "vaccine-changed-lives-here", "Communities share their health stories one year on."],
  ["The Fashion Recycle", "fashion-recycle", "Designers turn textile waste into high street style."],
  ["Storm Season Prep", "storm-season-prep", "How coastal regions are bracing for stronger weather."],
  ["Reading the Constitution", "reading-the-constitution", "A plain-language look at the laws shaping everyday rights."],
  ["The Grandmother's Market", "grandmothers-market", "Vendors explain how tradition meets trade at the weekly market."],
  ["Five Questions with a Mayor", "five-questions-with-a-mayor", "A city leader on housing, transport and the year ahead."],
  ["The Water Engineers", "water-engineers", "Simple projects bringing clean water to dry districts."],
  ["Weddings Across Borders", "weddings-across-borders", "Two families, two countries and one big celebration."],
  ["The Retail Revival", "retail-revival", "Main street shops find new ways to win customers back."],
  ["Inside the Peace Accord", "inside-the-peace-accord", "What the deal really changes on the ground."],
  ["Young Farmers Network", "young-farmers-network", "A new generation chooses a career on the land."],
  ["The Museum Reopening", "museum-reopening", "Repatriated artefacts return home after a century abroad."],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sampleImageUrl(seed: string, width = 1200, height = 760) {
  return `https://picsum.photos/seed/world-current-${seed}/${width}/${height}`;
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
        text: `${title}. This ${category} story is seeded for local previews and written by the desk with readers in mind.`,
      },
      {
        type: "paragraph",
        text: "Reporters spoke to people directly affected, reviewed the available figures and placed the story in the context of the wider news agenda across Africa, Britain, America and beyond.",
      },
      {
        type: "paragraph",
        text: "The full picture will continue to develop, and the newsroom will update this piece as new details and reaction come in from those involved.",
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
  await tx.delete(articles).where(sql`${articles.sourceName} IN ('THE WORLD CURRENT Demo', 'Daily Chronicle Demo')`);
  await tx.delete(navbarItems);
  await tx.delete(categories).where(inArray(categories.slug, legacyCategorySlugs));
  await tx.delete(tags).where(sql`${tags.slug} LIKE 'demo-%'`);
  await tx.delete(media).where(sql`${media.bunnyPath} LIKE 'demo/%'`);
  await tx.delete(homepageSections);
  await tx.delete(authenticators).where(sql`${authenticators.providerAccountId} LIKE 'demo-%'`);
  await tx.delete(accounts).where(sql`${accounts.provider} = 'demo'`);
  await tx.delete(sessions).where(sql`${sessions.sessionToken} LIKE 'demo-session-%'`);
  await tx.delete(verificationTokens).where(sql`${verificationTokens.identifier} = 'demo@example.com'`);
}

export async function seedDatabase(database: LibSQLDatabase<typeof schema> = db) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-locally";
  const hashedPassword = await hash(adminPassword, 12);

  const result = await database.transaction(async (tx) => {
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

    imageRows.push(
      {
        kind: "IMAGE" as const,
        title: "Homepage billboard advert",
        altText: "Luxury coastal travel advertisement creative",
        caption: "Generated homepage billboard advertising image.",
        bunnyPath: "demo/ads/homepage-billboard.jpg",
        publicUrl: "/ads/generated-travel-billboard.webp",
        mimeType: "image/webp",
        byteSize: 54_000,
        width: 1200,
        height: 320,
        metadata: { provider: "imagegen", demo: true, slot: "HOMEPAGE_TOP" },
        uploadedById: editor.id,
      },
      {
        kind: "IMAGE" as const,
        title: "Homepage middle advert",
        altText: "Finance growth advertisement creative",
        caption: "Generated finance sidebar advertising image.",
        bunnyPath: "demo/ads/homepage-middle.jpg",
        publicUrl: "/ads/generated-finance-sidebar.webp",
        mimeType: "image/webp",
        byteSize: 22_000,
        width: 600,
        height: 760,
        metadata: { provider: "imagegen", demo: true, slot: "HOMEPAGE_MIDDLE" },
        uploadedById: editor.id,
      },
      {
        kind: "IMAGE" as const,
        title: "Sidebar travel advert",
        altText: "Lifestyle shopping advertisement creative",
        caption: "Generated lifestyle shopping advertising image.",
        bunnyPath: "demo/ads/sidebar-travel.jpg",
        publicUrl: "/ads/generated-shopping-sidebar.webp",
        mimeType: "image/webp",
        byteSize: 73_000,
        width: 600,
        height: 760,
        metadata: { provider: "imagegen", demo: true, slot: "HOMEPAGE_MIDDLE" },
        uploadedById: editor.id,
      },
      {
        kind: "IMAGE" as const,
        title: "Sidebar finance advert",
        altText: "Wellness lifestyle advertisement creative",
        caption: "Generated wellness advertising image.",
        bunnyPath: "demo/ads/sidebar-finance.jpg",
        publicUrl: "/ads/generated-wellness-sidebar.webp",
        mimeType: "image/webp",
        byteSize: 34_000,
        width: 600,
        height: 760,
        metadata: { provider: "imagegen", demo: true, slot: "ARTICLE_SIDEBAR" },
        uploadedById: editor.id,
      },
    );

    for (const [videoTitle, videoSlug, videoCaption] of videoEntries) {
      imageRows.push({
        kind: "VIDEO" as const,
        title: videoTitle,
        slug: videoSlug,
        altText: videoCaption,
        caption: videoCaption,
        bunnyPath: `demo/video/${videoSlug}.mp4`,
        publicUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        posterUrl: sampleImageUrl(`video-${videoSlug}`, 1280, 720),
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
      const headlineBank = categoryHeadlines[category.slug] ?? categoryHeadlines.news;
      const isLegacyMostReadLink = category.slug === "news";

      for (let index = 0; index < articlesPerCategory; index += 1) {
        const template = headlineBank[index % headlineBank.length];
        const articleNumber = Math.floor(index / headlineBank.length) + 1;
        const hasStoryVariant = articleNumber > 1;
        const title = `${template}${hasStoryVariant ? ` — ${articleNumber}${index % 2 === 0 ? "a" : "b"}` : ""}`;
        const slug = `${category.slug}-${slugify(template)}-${index + 1}`;
        const publishedAt = daysAgo(categoryIndex + index);
        const author = authors[(categoryIndex + index) % authors.length];
        const heroImage = mediaByPath.get(`demo/${category.slug}/image-${(index % 5) + 1}.jpg`);
        const heroVideo = isLegacyMostReadLink && index === 0
          ? mediaByPath.get("demo/video/world-current-briefing.mp4")
          : undefined;

        articleRows.push({
          title,
          slug,
          subtitle: `${category.name} desk reporting, context and reaction`,
          excerpt: `The ${category.name.toLowerCase()} desk on ${template.toLowerCase().replace(/^breaking:?|^live updates:?|^in depth:?|^exclusive:?/i, "").trim()} — a fuller picture of the story behind today's headlines.`,
          content: articleBody(title, category.name),
          renderedContent: `<p>${title}</p><p>This seeded ${category.name.toLowerCase()} article is ready for newsroom previews, category archives and social discovery, with desk-led context and relatable detail.</p>`,
          status: "PUBLISHED" as const,
          type:
            index === 0 ? ("BREAKING" as const)
            : index === 1 ? ("ANALYSIS" as const)
            : index % 7 === 3 ? ("OPINION" as const)
            : index % 9 === 5 ? ("INTERVIEW" as const)
            : index % 11 === 7 ? ("EXPLAINER" as const)
            : ("STANDARD" as const),
          authorId: author.id,
          heroImageId: heroImage?.id,
          heroVideoId: heroVideo?.id,
          mobileHeroImageId: heroImage?.id,
          socialImageId: heroImage?.id,
          seoTitle: title.slice(0, 70),
          seoDescription: `${category.name} desk reporting and context from THE WORLD CURRENT.`,
          sourceName: "THE WORLD CURRENT Demo",
          sourceUrl: `https://example.com/demo/${slug}`,
          isFeatured: index === 0,
          allowComments: true,
          readingMinutes: 3 + (index % 8),
          viewCount: 2500 - categoryIndex * 95 - (index % 40) * 31,
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
      const category = seededCategories[Math.floor(index / articlesPerCategory)];
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
        seededArticles.slice(
          categoryIndex * articlesPerCategory,
          categoryIndex * articlesPerCategory + articlesPerCategory,
        ),
      ]);
    }

    homepageConfig.unshift(
      ["hero", seededArticles.slice(0, 5)],
      ["latest", seededArticles.slice(5, 13)],
      ["featured", seededArticles.filter((_, index) => index % articlesPerCategory === 0).slice(0, 8)],
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
          dekOverride: position === 0 ? "Curated by the newsroom for readers across Africa, Britain, America and the wider world." : undefined,
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

    const billboardAdMedia = mediaByPath.get("demo/ads/homepage-billboard.jpg");
    const middleAdMedia = mediaByPath.get("demo/ads/homepage-middle.jpg");
    const travelAdMedia = mediaByPath.get("demo/ads/sidebar-travel.jpg");
    const financeAdMedia = mediaByPath.get("demo/ads/sidebar-finance.jpg");
    const seededAds = await tx
      .insert(advertisements)
      .values([
        {
          name: "Demo Homepage Billboard",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/homepage-billboard",
          mediaId: billboardAdMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Homepage Middle",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/homepage-middle",
          mediaId: middleAdMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Sidebar Travel",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/sidebar-travel",
          mediaId: travelAdMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Sidebar Finance",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/sidebar-finance",
          mediaId: financeAdMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Article Sidebar",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/article-sidebar",
          mediaId: financeAdMedia?.id ?? middleAdMedia?.id,
          startsAt: daysAgo(1),
          endsAt: daysAgo(-30),
        },
        {
          name: "Demo Category Top",
          status: "ACTIVE",
          targetUrl: "https://example.com/demo/category-top",
          mediaId: billboardAdMedia?.id,
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
        slot: "HOMEPAGE_MIDDLE",
        position: 1,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
      {
        advertisementId: seededAds[2].id,
        slot: "HOMEPAGE_MIDDLE",
        position: 2,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
      {
        advertisementId: seededAds[3].id,
        slot: "HOMEPAGE_MIDDLE",
        position: 3,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
      {
        advertisementId: seededAds[4].id,
        slot: "ARTICLE_SIDEBAR",
        articleId: seededArticles[0].id,
        position: 1,
        startsAt: daysAgo(1),
        endsAt: daysAgo(-30),
      },
      {
        advertisementId: seededAds[5].id,
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
  return result;
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .catch((error) => {
      console.error("Database seed failed", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      connection.close();
    });
}
