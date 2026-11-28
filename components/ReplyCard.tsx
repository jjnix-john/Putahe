import { Pressable, Text, View } from "react-native";
import type { ForumReply } from "@/types/index";

interface ReplyCardProps {
  reply: ForumReply;
  isOwn: boolean;
  onDelete: () => void;
  onReport?: () => void;
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

export function ReplyCard({
  reply,
  isOwn,
  onDelete,
  onReport,
}: ReplyCardProps) {
  const authorName =
    reply.profiles?.display_name ?? reply.author_id.slice(0, 8);

  return (
    <View
      className={`rounded-xl px-4 py-3 mb-2 ${
        isOwn
          ? "bg-[#EDF5EC] border border-[#D4E3D1]"
          : "bg-white border border-[#E8ECE4]"
      }`}
    >
      {/* Author + time */}
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-x-2">
          <Text className="text-xs font-bold text-khaki">{authorName}</Text>
          {isOwn && (
            <View className="bg-malachite/30 rounded-full px-1.5 py-0.5">
              <Text className="text-khaki text-xs font-semibold">you</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-x-2">
          <Text className="text-olive-light text-xs">
            {formatRelativeTime(reply.created_at)}
          </Text>
          {isOwn ? (
            <Pressable
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="active:opacity-60"
            >
              <Text className="text-red-500 text-xs font-semibold">Delete</Text>
            </Pressable>
          ) : onReport ? (
            <Pressable
              onPress={onReport}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="active:opacity-60"
            >
              <Text className="text-olive-light text-xs font-semibold">
                Report
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Body */}
      <Text className="text-khaki text-sm leading-relaxed">{reply.body}</Text>
    </View>
  );
}
