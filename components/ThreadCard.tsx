import { Pressable, Text, View } from "react-native";
import type { ForumPost } from "@/types/index";

interface ThreadCardProps {
  post: ForumPost;
  onPress: () => void;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ThreadCard({ post, onPress }: ThreadCardProps) {
  const authorName =
    post.profiles?.display_name ?? post.author_id.slice(0, 8);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-[#E8ECE4] rounded-xl px-4 py-3 mb-3 active:opacity-75"
      style={{ elevation: 1 }}
    >
      {/* Title */}
      <Text
        className="text-khaki font-bold text-sm leading-snug"
        numberOfLines={2}
      >
        {post.title}
      </Text>

      {/* Recipe tag */}
      {post.recipe_tag ? (
        <View className="mt-1 self-start bg-[#EDF5EC] rounded-full px-2 py-0.5">
          <Text className="text-olive text-xs font-semibold">
            #{post.recipe_tag}
          </Text>
        </View>
      ) : null}

      {/* Meta row */}
      <View className="flex-row items-center mt-2 gap-x-3">
        <Text className="text-olive-light text-xs">{authorName}</Text>
        <Text className="text-olive-light text-xs">·</Text>
        <Text className="text-olive-light text-xs">
          {formatRelativeTime(post.created_at)}
        </Text>
        {post.reply_count !== undefined && post.reply_count > 0 && (
          <>
            <Text className="text-olive-light text-xs">·</Text>
            <Text className="text-olive text-xs font-semibold">
              {post.reply_count}{" "}
              {post.reply_count === 1 ? "reply" : "replies"}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}
