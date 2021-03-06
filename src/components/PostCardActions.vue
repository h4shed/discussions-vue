<template>
  <v-card-actions :class="{ 'text-small': $vuetify.breakpoint.mobile  }">
    <v-btn icon @click="expands = expands ? 0 : -1">
    <v-icon>{{ expands ? 'expand_more' : 'expand_less' }}</v-icon>
    </v-btn>
    <v-btn :color="(post.myVote > 0) ? 'success' : ''" small icon @click="vote(1)">
      <v-icon>thumb_up</v-icon>
    </v-btn>
    <span>{{ post.getVoteScore() }}</span>
    <v-btn :color="(post.myVote < 0) ? 'error': ''" small icon @click="vote(-1)">
      <v-icon>thumb_down</v-icon>
    </v-btn>

    <v-btn text @click="mediaViewer()" v-show="false">
      <v-icon>photo_album</v-icon>
    </v-btn>

    <v-btn text v-if="!$vuetify.breakpoint.mobile && post.uuid == post.threadUuid">        
      <v-icon>mdi-eye</v-icon>
      <span>{{ post.views }}</span>
    </v-btn>

    <PostThreadLink btn :post="post" v-if="!isCommentDisplay">
      <span>
        <v-icon>comment</v-icon>
        {{ post.totalReplies }}
      </span>
    </PostThreadLink>

        <v-btn text v-else @click="$emit('reply')">
      <v-icon>comment</v-icon>
    </v-btn>

    <v-btn v-if="!isLoggedIn || (myPublicKey != post.pub)" text @click="sendTip()">
      <v-icon>attach_money</v-icon>
    </v-btn>

    <v-menu>
      <template v-slot:activator="{ on, attrs }">
        <v-btn icon v-bind="attrs" v-on="on">
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-show="isLoggedIn && (myPublicKey == post.pub) && !noEdit">
          <v-btn text @click="$emit('edit')">
            <v-icon>edit</v-icon>
            <span>Edit</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <PostThreadLink btn copy :post="post">
            <v-icon>link</v-icon>
            <span>copy link</span>
          </PostThreadLink>
        </v-list-item>
        <v-list-item v-show="(isLoggedIn) && (post.uuid == post.threadUuid)">
          <v-btn text @click="watchThread()">
            <v-icon>watch_later</v-icon>
            <span>{{ isThreadWatched(post.uuid) ? 'unwatch' : 'watch' }}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="markAsPinned()">
            <v-icon color="green">push_pin</v-icon>
            <span>{{ isMyPolicy('pinned') ? 'unpin' : 'pin'}}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="markAsSpam()">
            <v-icon color="error">error</v-icon>
            <span>{{ isMyPolicy('spam') ? 'not spam' : 'spam' }}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="markAsNSFW()">
            <v-chip class="mr-1" small color="orange" text-color="white">18+</v-chip>
            <span>{{ isMyPolicy('nsfw') ? 'sfw' : 'nsfw' }}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <TransactionLink btn :chain="post.chain" :transaction="post.transaction">
            <v-icon>zoom_in</v-icon>On Chain
          </TransactionLink>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="share('twitter')">
            <v-icon>mdi-twitter</v-icon>
            <span>Share</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="share('fb')">
            <v-icon>mdi-facebook</v-icon>
            <span>Share</span>
          </v-btn>
        </v-list-item>
        <v-list-item
          v-if="post.threadUuid == post.uuid && post.threadTree && !post.threadTree.artificial"
        >
          <v-btn text @click="raindrop()">
            <v-icon>mdi-weather-pouring</v-icon>
            <span>Raindrop</span>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
    <PostCardInfo :post="post" />
  </v-card-actions>

</template>

<script>
import { mapState, mapGetters } from "vuex";
import {
  submitVote,
  modPolicySetTags,
  getUserAuth,
  addViewToPost
} from "@/novusphere-js/discussions/api";
import { sleep } from "@/novusphere-js/utility";
import config from "@/server/site";
import PostCardInfo from "@/components/PostCardInfo";

import { threadLinkMixin } from "@/mixins/threadLink";

import PostThreadLink from "@/components/PostThreadLink";
import TransactionLink from "@/components/TransactionLink";

export default {
  name: "PostCardActions",
  mixins: [threadLinkMixin],
  components: {
    //PublicKeyIcon
    PostThreadLink,
    PostCardInfo,
    TransactionLink,
    //PostTips
  },
  props: {
    post: Object,
    noEdit: Boolean,
    isCommentDisplay: Boolean,
    expands: Number,
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isThreadWatched"]),
    ...mapState({
      keys: (state) => state.keys,
      myPublicKey: (state) => (state.keys ? state.keys.arbitrary.pub : ""),
    }),
  },
  watch: {
  expands: function() {
    this.$emit("expandsProxy", this.expands);
    },
    isCompactDisplay() {
      if (this.isCompactDisplay) this.expands = -1;
      else this.expands = 0;
    },
  },

  data: () => ({
  expands: 0, // 0 is show, -1 is don't show
  }),
  async mounted() {
    if (this.isCompactDisplay) this.expands = -1;
    else this.expands = 0;
  },
  methods: {
    async mediaViewer() {
      const srcs = await this.post.getAllContentImages();
      if (srcs.length > 0) {
        this.$store.commit("setImageViewer", srcs);
      }
    },
    async raindrop() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      const recipients = [];
      for (const r of Object.values(this.post.threadTree)) {
        if (r.post.pub == this.keys.arbitrary.pub) continue; // don't tip self
        if (recipients.find((rc) => rc.pub == r.post.pub)) continue; // already in recipients

        recipients.push({
          pub: r.post.pub,
          uidw: r.post.uidw,
          displayName: r.post.displayName,
          memo: `raindrop to ${
            r.post.displayName
          } for ${this.post.getRelativeUrl(false)}`,
          uuid: r.post.uuid,
          callback: ({ transaction, transferActions }) =>
            this.$emit("tip", {
              uuid: r.post.uuid,
              transaction,
              transferActions,
            }),
        });
      }

      this.$store.commit("setSendTipDialogOpen", {
        value: true,
        recipients: recipients,
      });
    },
    async share(where) {
      const link = config.url + this.link;
      const tags = this.post.tags.filter((t) => !["all"].some((t2) => t2 == t));

      let url = undefined;
      let features = undefined;
      if (where == "twitter") {
        const { auth: authorAuth } = await getUserAuth(this.post.pub);
        const authorTwitter = authorAuth.find((a) => a.name == "twitter");

        const by = authorTwitter ? authorTwitter.username : "";
        const mentions = [];

        // Make it so only OP tweet sharing notifies twitter mentions, #154
        if (this.isLoggedIn && this.keys.arbitrary.pub == this.post.pub) {
          for (const mentionedPub of this.post.mentions) {
            const { auth } = await getUserAuth(mentionedPub);
            const twitter = auth.find((a) => a.name == "twitter");
            if (twitter) {
              console.log(`Found ${mentionedPub} -> @${twitter.username}`);
              mentions.push(twitter.username);
            }
          }
        }

        let tweet = this.post.title ? `${this.post.title} a ` : `A `;
        if (this.post.uuid == this.post.threadUuid && this.post.sub == "blog")
          tweet += `blog `;
        else tweet += `post `;

        if (by) tweet += `by @${by} `;
        tweet += `via @thenovusphere ${link} `;
        if (tags.length > 0) tweet += `${tags.map((t) => `#${t}`).join(" ")} `;
        if (mentions.length > 0)
          tweet += `${mentions.map((m) => `@${m}`).join(" ")} `;

        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          tweet
        )}`;
        features =
          "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,width=600,height=600";
      } else if (where == "fb") {
        url =
          `https://www.facebook.com/sharer/sharer.php?u=${link}` +
          `&t=${tags.join(", ")}`;
        features =
          "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600";
      }

      if (url) {
        window.open(url, "", features);
      }
    },
    isMyPolicy(tag) {
      let pol = this.post.getMyModPolicy(this.myPublicKey);
      return pol.find((t) => t == tag);
    },
    async adjustModPolicy(tag) {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      let pol = this.post.getMyModPolicy(this.myPublicKey);

      if (pol.find((t) => t == tag)) pol = pol.filter((t) => t != tag);
      else pol.push(tag);

      this.post.setMyModPolicy(this.myPublicKey, pol);

      await modPolicySetTags(this.keys.arbitrary.key, this.post.uuid, pol);
    },
    async watchThread() {
      if (!this.isLoggedIn) return;
      if (this.isThreadWatched(this.post.uuid)) {
        this.$store.commit("unwatchThread", this.post.uuid);
      } else {
        this.$store.commit("watchThread", {
          uuid: this.post.uuid,
          transaction: this.post.transaction,
        });
      }
    },
    async markAsSpam() {
      await this.adjustModPolicy("spam");
    },
    async markAsNSFW() {
      await this.adjustModPolicy("nsfw");
    },
    async markAsPinned() {
      await this.adjustModPolicy("pinned");
    },
    async sendTip() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }
      this.$store.commit("setSendTipDialogOpen", {
        value: true,
        recipients: [
          {
            pub: this.post.pub,
            uidw: this.post.uidw,
            displayName: this.post.displayName,
            memo: `tip to ${
              this.post.displayName
            } for ${this.post.getRelativeUrl(false)}`,
            uuid: this.post.uuid,
            callback: ({ transaction, transferActions }) =>
              this.$emit("tip", {
                uuid: this.post.uuid,
                transaction,
                transferActions,
              }),
          },
        ],
      });
    },
    async vote(value) {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }
      if (this.post.myVote == value) return;

      if (this.post.myVote != 0) {
        if (this.post.myVote == 1) this.post.upvotes -= 1;
        else if (this.post.myVote == -1) this.post.downvotes -= 1;
      }

      if (value != 0) {
        if (value == 1) this.post.upvotes += 1;
        else if (value == -1) this.post.downvotes += 1;
      }

      this.post.myVote = value;

      // we make the assumption from here that the vote succeeds
      await sleep(500);
      const trxid = await submitVote(this.keys.arbitrary.key, {
        value: value,
        uuid: this.post.uuid,
        uidw: this.keys.wallet.pub,
      });

      if (trxid && this.post.uuid == this.post.threadUuid) {
        addViewToPost(this.post.uuid);
      }

      console.log(`vote trxid: ${trxid}`);
    },
  },
};
</script>

<style lang="scss">
.text-small {
  font-size: 12px;

  .v-avatar {
    min-width: 16px !important;
    height: 16px !important;
    width: 16px !important;
  }
}
</style>
