import { asc } from "drizzle-orm";
import { ChevronDown, FolderPlus, FolderTree, Navigation, Tags, X } from "lucide-react";

import InfoTooltip from "@/components/admin/info-tooltip";
import { SubmitButton } from "@/components/admin/submit-button";
import { createTag, deleteTag, saveCategory, saveNavbar } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { getDb } from "@/src/db";
import { categories, navbarItems, tags } from "@/src/db/schema";

export default async function TaxonomyAdminPage() {
  await requireAdminUser("taxonomy:manage");
  const db = await getDb();
  const [categoryRows, tagRows, navRows] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(categories.position), asc(categories.name)] }),
    db.query.tags.findMany({ orderBy: [asc(tags.name)] }),
    db.query.navbarItems.findMany({ orderBy: [asc(navbarItems.position)] }),
  ]);
  const navByCategory = new Map(navRows.map((item) => [item.categoryId, item]));
  const categoryById = new Map(categoryRows.map((item) => [item.id, item]));
  const activeCount = categoryRows.filter((category) => category.isActive).length;

  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Structure</span>
          <h1>Taxonomy & navigation</h1>
          <p>Organize publication sections, article labels, and the public navigation bar.</p>
        </div>
      </header>

      <section className="admin-taxonomy-tools" aria-label="Taxonomy setup">
        <details className="admin-card admin-taxonomy-tool" name="taxonomy-tools">
          <summary>
            <span className="admin-taxonomy-tool-icon"><FolderPlus size={19} /></span>
            <span><strong>Create category</strong><small>Add a new publication section or subsection.</small></span>
            <ChevronDown size={18} />
          </summary>
          <div className="admin-taxonomy-tool-body">
            <form action={saveCategory.bind(null, null)} className="admin-form-grid two">
              <label>Name<input name="name" required /></label>
              <label>Slug<input name="slug" placeholder="Generated from name" /></label>
              <label>
                Parent
                <select name="parentId">
                  <option value="">Top level</option>
                  {categoryRows.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>Position<input name="position" type="number" min="0" defaultValue="0" /></label>
              <label className="span-two">Description<textarea name="description" rows={2} /></label>
              <label className="admin-check"><input type="checkbox" name="isActive" defaultChecked />Active</label>
              <SubmitButton>Create category</SubmitButton>
            </form>
          </div>
        </details>

        <details className="admin-card admin-taxonomy-tool" name="taxonomy-tools">
          <summary>
            <span className="admin-taxonomy-tool-icon"><Tags size={19} /></span>
            <span><strong>Manage tags</strong><small>{tagRows.length} labels available for articles.</small></span>
            <ChevronDown size={18} />
          </summary>
          <div className="admin-taxonomy-tool-body">
            <form action={createTag} className="admin-inline-form admin-tag-create-form">
              <input name="name" required placeholder="Tag name" aria-label="Tag name" />
              <input name="slug" placeholder="Optional slug" aria-label="Tag slug" />
              <SubmitButton>Add tag</SubmitButton>
            </form>
            <div className="admin-tag-list">
              {tagRows.map((tag) => (
                <span key={tag.id}>
                  {tag.name}
                  <form action={deleteTag.bind(null, tag.id)}>
                    <button aria-label={`Delete ${tag.name}`}><X size={12} /></button>
                  </form>
                </span>
              ))}
              {tagRows.length === 0 ? <p className="admin-empty">No tags created yet.</p> : null}
            </div>
          </div>
        </details>
      </section>

      <div className="admin-taxonomy-list-heading">
        <div>
          <span className="admin-eyebrow">Publication sections</span>
          <h2>Categories & navigation <InfoTooltip text="Categories organize articles into publication sections. Navigation settings determine which category links appear publicly and in what order." /></h2>
        </div>
        <span><FolderTree size={16} />{activeCount} active of {categoryRows.length}</span>
      </div>

      <section className="admin-taxonomy-list" aria-label="Categories and navigation">
        {categoryRows.map((category) => {
          const nav = navByCategory.get(category.id);
          const parent = category.parentId ? categoryById.get(category.parentId) : null;

          return (
            <details className="admin-card admin-taxonomy-category" name="taxonomy-categories" key={category.id}>
              <summary>
                <span className="admin-taxonomy-position">{category.position}</span>
                <span className="admin-taxonomy-category-name">
                  <strong>{category.name}</strong>
                  <small>{parent ? `${parent.name} / ${category.slug}` : `/${category.slug}`}</small>
                </span>
                <span className={`admin-status ${category.isActive ? "active" : "disabled"}`}>
                  {category.isActive ? "Active" : "Hidden"}
                </span>
                <span className={`admin-taxonomy-nav-state${nav?.isActive ? " is-visible" : ""}`}>
                  <Navigation size={13} />{nav?.isActive ? "In navigation" : "Not in navigation"}
                </span>
                <ChevronDown size={18} />
              </summary>

              <div className="admin-category-card">
                <form action={saveCategory.bind(null, category.id)} className="admin-form-section">
                  <div className="admin-section-heading">
                    <div><span className="admin-eyebrow">Category</span><h2>Section details</h2></div>
                  </div>
                  <div className="admin-form-grid two">
                    <label>Name<input name="name" defaultValue={category.name} /></label>
                    <label>Slug<input name="slug" defaultValue={category.slug} /></label>
                    <label>Position<input name="position" type="number" min="0" defaultValue={category.position} /></label>
                    <label>
                      Parent
                      <select name="parentId" defaultValue={category.parentId ?? ""}>
                        <option value="">Top level</option>
                        {categoryRows
                          .filter((item) => item.id !== category.id)
                          .map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>Description<textarea name="description" rows={2} defaultValue={category.description ?? ""} /></label>
                  <label className="admin-check">
                    <input type="checkbox" name="isActive" defaultChecked={category.isActive} />Category active
                  </label>
                  <SubmitButton>Save category</SubmitButton>
                </form>

                <form action={saveNavbar.bind(null, category.id)} className="admin-form-section admin-nav-editor">
                  <div className="admin-section-heading">
                    <div><span className="admin-eyebrow">Navigation</span><h2>Public menu</h2></div>
                  </div>
                  <div className="admin-form-grid two">
                    <label>Label<input name="label" defaultValue={nav?.label ?? category.name} /></label>
                    <label>Position<input name="position" type="number" min="1" defaultValue={nav?.position ?? category.position + 1} /></label>
                  </div>
                  <label>Link<input name="href" defaultValue={nav?.href ?? `/section/${category.slug}`} /></label>
                  <label className="admin-check">
                    <input type="checkbox" name="isActive" defaultChecked={nav?.isActive ?? true} />Show in navigation
                  </label>
                  <SubmitButton>Save navigation</SubmitButton>
                </form>
              </div>
            </details>
          );
        })}
        {categoryRows.length === 0 ? <p className="admin-empty admin-card">No categories created yet.</p> : null}
      </section>
    </>
  );
}
