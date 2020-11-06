<template>
  <v-card-actions :class="{ 'text-small': $vuetify.breakpoint.mobile  }">
      <div class="pl-3 mt-1">
        <div class="d-inline">
          <div
            class="d-inline-block pr-3"
            v-if="(!$vuetify.breakpoint.mobile && !post.threadTree) || (isNotifications) || (!isCommentDisplay && isThread) || (isBrowsing && isMultiTag)"
          >
            <TagLink
              :class="{'nsfw-blur': post.isNSFW && blurNSFW && !removeNSFWOverlay }"
              inline
              #popover #gives_tag_menu
              :tag="post.sub"
            />
          </div>
          <div class="d-inline-block pr-3">
            <UserProfileLink
              popover
              :class="{'moderator': isModerator(post.sub, post.pub), 'nsfw-blur': post.isNSFW && blurNSFW && !removeNSFWOverlay }"
              :displayName="post.displayName"
              :publicKey="post.pub"
            />
          </div>
        </div>
        <div class="d-inline-block pr-3">
          <PostThreadLink :post="post">
            <span v-show="!post.edit">{{ shortTime(post.createdAt) }}</span>
            <span v-show="post.edit">
              <v-icon dense small>edit</v-icon>
              {{ shortTime(post.editedAt) }}
            </span>
          </PostThreadLink>
        </div>
        <div class="d-inline-block pr-3" v-if="post.isPinned || post.isSpam || post.isNSFW">
          <v-icon v-if="post.isPinned" color="success">push_pin</v-icon>
          <v-icon v-if="post.isSpam" color="error">error</v-icon>
          <v-chip v-if="post.isNSFW" small color="orange" text-color="white">18+</v-chip>
        </div>
        <div class="d-inline-block pr-3">
          <PostTips class="d-inline" :post="post" />
        </div>
      </div>
  </v-card-actions>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { userActionsMixin } from "@/mixins/userActions";
import { shortTimeMixin } from "@/mixins/shortTime";
import UserProfileLink from "@/components/UserProfileLink";
import TagLink from "@/components/TagLink";
import PostTips from "@/components/PostTips";
import PostThreadLink from "@/components/PostThreadLink";
export default {
  name: "PostCardInfo",
  mixins: [shortTimeMixin, userActionsMixin],
  components: {
    UserProfileLink,
    TagLink,
    PostTips,
    PostThreadLink,
  },
  props: {
    clickable: Boolean,
    post: Object,
    comments: Array,
    display: String,
    editing: Boolean,
  },
  computed: {
    isThread() {
      return this.post.uuid == this.post.threadUuid;
    },
    isCompactContent() {
      return this.post.content.length <= 300;
    },
    isCommentDisplay() {
      return this.display == "comment";
    },
    isNotifications() {
      return this.$route.path == "/notifications/posts";
    },

    isCompactDisplay() {
      return this.display == "compact";
    },
    isPreviewDisplay() {
      return this.display == "preview";
    },
    isFullDisplay() {
      return this.display == "full";
    },
    isMultiTag() {
      if (!this.isBrowsing) return false;
      if (!this.$route.params.tags) return true; // assume we're on a multi tag
      const tags = this.$route.params.tags.split(",");
      return tags.length > 1 || (tags.length == 1 && tags[0] == "all");
    },
    isBrowsing() {
      // one of the browsing display modes
      return (
        this.isCompactDisplay || this.isPreviewDisplay || this.isFullDisplay
      );
    },
    ...mapGetters(["isModerator", "isLoggedIn"]),
    ...mapState({
      hideSpam: (state) => state.hideSpam,
      blurNSFW: (state) => state.blurNSFW,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    removeNSFWOverlay: false,
  }),
};
</script>

