import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCompanionOption } from "@/lib/companions";
import type { ForumPost } from "@/types/index";

interface ThreadCardProps {
  post: ForumPost;
  isOwn?: boolean;
  onPress: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

export function ThreadCard({
  post,
  isOwn = false,
  onPress,
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
  onReport,
}: ThreadCardProps) {
  const authorName =
    post.profiles?.display_name ?? post.author_id.slice(0, 8);
  const avatarId = post.profiles?.avatar_url;
  const companionOpt = getCompanionOption(avatarId);

  const likeCount = post.like_count ?? 0;
  const replyCount = post.reply_count ?? 0;
  const liked = Boolean(post.liked_by_me);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Top Author Row + Own Post Controls */}
      <View style={styles.headerRow}>
        <View style={styles.authorLeft}>
          <View
            style={[
              styles.avatarCircle,
              {
                borderColor: companionOpt.accentColor,
                backgroundColor: companionOpt.badgeBg,
              },
            ]}
          >
            <Image
              source={companionOpt.image}
              style={styles.avatarImg}
              resizeMode="contain"
            />
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.authorName}>{authorName}</Text>
              {isOwn && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            <Text style={styles.timeText}>
              {formatRelativeTime(post.created_at)}
              {post.updated_at ? " • edited" : ""}
            </Text>
          </View>
        </View>

        {/* Manage Own Post Buttons (Edit & Delete) or Report Button */}
        {isOwn && (onEdit || onDelete) ? (
          <View style={styles.ownerActions}>
            {onEdit && (
              <Pressable
                onPress={onEdit}
                hitSlop={8}
                style={styles.ownerIconBtn}
              >
                <Ionicons name="create-outline" size={16} color="#646F58" />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                onPress={onDelete}
                hitSlop={8}
                style={[styles.ownerIconBtn, styles.deleteIconBtn]}
              >
                <Ionicons name="trash-outline" size={16} color="#B91C1C" />
              </Pressable>
            )}
          </View>
        ) : !isOwn && onReport ? (
          <Pressable
            onPress={onReport}
            hitSlop={8}
            style={styles.ownerIconBtn}
          >
            <Ionicons name="flag-outline" size={15} color="#7D8570" />
          </Pressable>
        ) : null}
      </View>

      {/* Post Title & Body Preview */}
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      {post.body ? (
        <Text style={styles.bodyPreview} numberOfLines={3}>
          {post.body}
        </Text>
      ) : null}

      {/* Recipe Tag */}
      {post.recipe_tag ? (
        <View style={styles.tagPill}>
          <Ionicons name="pricetag-outline" size={11} color="#646F58" />
          <Text style={styles.tagText}>#{post.recipe_tag}</Text>
        </View>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Social Action Bar: Like, Comment, Share */}
      <View style={styles.actionBar}>
        {/* Like Button */}
        <Pressable
          onPress={onLike ?? onPress}
          hitSlop={6}
          style={[styles.actionBtn, liked && styles.actionBtnLiked]}
        >
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={17}
            color={liked ? "#504B3A" : "#646F58"}
          />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
            {likeCount > 0 ? `${likeCount} ` : ""}
            {likeCount === 1 ? "Like" : "Likes"}
          </Text>
        </Pressable>

        {/* Comment Button */}
        <Pressable
          onPress={onComment ?? onPress}
          hitSlop={6}
          style={styles.actionBtn}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#646F58" />
          <Text style={styles.actionText}>
            {replyCount > 0 ? `${replyCount} ` : ""}
            {replyCount === 1 ? "Comment" : "Comments"}
          </Text>
        </Pressable>

        {/* Share Button */}
        <Pressable
          onPress={onShare ?? onPress}
          hitSlop={6}
          style={styles.actionBtn}
        >
          <Ionicons name="share-social-outline" size={16} color="#646F58" />
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2EAE0",
    elevation: 3,
    shadowColor: "#504B3A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#504B3A",
  },
  youBadge: {
    backgroundColor: "#57E165",
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#504B3A",
  },
  timeText: {
    fontSize: 11.5,
    color: "#7D8570",
    fontWeight: "500",
  },
  ownerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ownerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F6F1",
    borderWidth: 1,
    borderColor: "#DCE4D8",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#504B3A",
    lineHeight: 21,
  },
  bodyPreview: {
    fontSize: 13.5,
    color: "#646F58",
    lineHeight: 19,
    marginTop: 5,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EDF5EC",
    borderColor: "#D4E3D1",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 9,
    gap: 4,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#646F58",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8ECE4",
    marginTop: 12,
    marginBottom: 10,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F5F7F3",
    borderWidth: 1,
    borderColor: "#E3E9DF",
    gap: 5,
  },
  actionBtnLiked: {
    backgroundColor: "#57E165",
    borderColor: "#46C953",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#646F58",
  },
  actionTextLiked: {
    color: "#504B3A",
    fontWeight: "800",
  },
});
