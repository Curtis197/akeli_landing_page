import { Link } from "@/lib/i18n/navigation";
import { renderInlineMarkdown } from "@/lib/utils/render-inline-markdown";
import type { PostBlock } from "@/lib/validations/post.schema";
import type { EmbeddedRecipe } from "@/lib/queries/blog-posts";

interface PostBlockViewProps {
  block: PostBlock;
  embeddedRecipes: Map<string, EmbeddedRecipe>;
  viewRecipeLabel: string;
}

function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return null;
}

export default function PostBlockView({ block, embeddedRecipes, viewRecipeLabel }: PostBlockViewProps) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-base leading-relaxed text-foreground mb-4">{renderInlineMarkdown(block.text)}</p>;

    case "heading": {
      const Tag = block.level === 2 ? "h2" : "h3";
      return <Tag className={block.level === 2 ? "text-2xl font-bold mt-8 mb-3 text-foreground" : "text-xl font-semibold mt-6 mb-2 text-foreground"}>{block.text}</Tag>;
    }

    case "quote":
      return (
        <blockquote className="border-l-4 border-primary pl-4 py-1 my-4 italic text-muted-foreground">
          <p>{renderInlineMarkdown(block.text)}</p>
          {block.author && <cite className="block mt-1 text-sm not-italic">— {block.author}</cite>}
        </blockquote>
      );

    case "divider":
      return <hr className="my-8 border-border" />;

    case "image":
      return (
        <figure className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.caption ?? ""} className="w-full rounded-xl" />
          {block.caption && <figcaption className="text-sm text-muted-foreground mt-2 text-center">{block.caption}</figcaption>}
        </figure>
      );

    case "image_gallery":
      return (
        <div className="grid grid-cols-2 gap-2 my-6">
          {block.urls.filter(Boolean).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
          ))}
        </div>
      );

    case "video_embed": {
      const embedUrl = youtubeEmbedUrl(block.url);
      if (!embedUrl) {
        return (
          <a href={block.url} target="_blank" rel="noopener noreferrer" className="block my-6 text-primary underline">
            {block.url}
          </a>
        );
      }
      return (
        <div className="aspect-video rounded-xl overflow-hidden my-6">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Vidéo intégrée" />
        </div>
      );
    }

    case "recipe_embed": {
      const recipe = embeddedRecipes.get(block.recipe_id);
      if (!recipe || !recipe.slug) return null;
      return (
        <Link
          href={`/recipe/${recipe.slug}`}
          className="flex items-center gap-4 my-6 p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors"
        >
          {recipe.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.cover_image_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-2xl">🍽️</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{recipe.title}</p>
            <p className="text-sm text-primary mt-1">{viewRecipeLabel} →</p>
          </div>
        </Link>
      );
    }

    default:
      return null;
  }
}
