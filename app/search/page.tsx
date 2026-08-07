import { Home, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import UserMenu from "@/components/user-menu";
import { searchArticles } from "@/src/db/queries/articles";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

function fallbackImage(seed: string) {
  return `https://picsum.photos/seed/daily-chronicle-search-${seed}/720/460`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

function formatDate(date: Date | null) {
  if (!date) {
    return "Unpublished";
  }

  return dateTimeFormatter.format(date);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const results = query ? await searchArticles(query) : [];

  return (
    <main className="route-page">
      <header className="route-header">
        <Link href="/" className="route-brand">
          Daily Chronicle
        </Link>
        <div className="route-actions">
          <Link href="/search" aria-label="Search" title="Search">
            <Search size={16} />
          </Link>
          <Link href="/" aria-label="Home" title="Home">
            <Home size={16} />
          </Link>
          <UserMenu size={16} />
        </div>
      </header>
      <div className="route-kicker">Search</div>
      <h1>Search</h1>
      <p>Find headlines, features and must-read stories across Daily Chronicle.</p>

      <form className="search-form" action="/search" method="get">
        <Search size={18} />
        <input
          aria-label="Search articles"
          name="q"
          defaultValue={query}
          placeholder="Search the newsroom…"
          autoFocus={!query}
        />
        <button type="submit">Search</button>
      </form>

      {query ? (
        <>
          <p className="search-summary">
            {results.length > 0
              ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`
              : `No results for "${query}"`}
          </p>

          {results.length > 0 ? (
            <div className="search-results">
              {results.map((article) => (
                <article key={article.id}>
                  <Link href={`/articles/${article.slug}`}>
                    <Image
                      src={article.heroImageUrl ?? fallbackImage(article.slug)}
                      alt={article.heroImageAlt ?? article.title}
                      width={720}
                      height={460}
                      sizes="(max-width: 768px) 100vw, 260px"
                    />
                  </Link>
                  <div>
                    <span>{article.categoryName}</span>
                    <h2>
                      <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                    </h2>
                    <p>
                      {article.excerpt ?? "The latest from the Daily Chronicle newsroom."}
                    </p>
                    <small>
                      {formatDate(article.publishedAt)} · {article.authorName}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="search-empty">
              Try a different term or browse a section from the navigation above.
            </p>
          )}
        </>
      ) : (
        <p className="search-empty">Type a keyword above to search published stories.</p>
      )}

      <Link href="/">Back to homepage</Link>
    </main>
  );
}
