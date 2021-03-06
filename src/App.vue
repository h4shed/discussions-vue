<template>
  <v-app>
    <AppBar />


    <v-main :style="{background: $vuetify.theme.themes[theme].background}">
      <AppAlertBar />
      <v-menu
        z-index="9999"
        v-if="popover.profile.open"
        max-width="400"
        v-model="profilePopover"
        :position-x="popover.profile.x"
        :position-y="popover.profile.y"
        :close-on-content-click="false"
      >
        <UserProfileCard
          :displayName="popover.profile.displayName"
          :publicKey="popover.profile.publicKey"
          :uidw="popover.profile.uidw"
          :extended-info="popover.profile.profileInfo"
          small
          show-social
        />
      </v-menu>

      <v-menu
        z-index="9999"
        v-if="popover.tag.open"
        max-width="400"
        v-model="tagPopover"
        :position-x="popover.tag.x"
        :position-y="popover.tag.y"
        :close-on-content-click="false"
      >
        <CommunityCard dense no-view :community="popover.tag.community" />
      </v-menu>

      <v-dialog
        :retain-focus="false"
        max-width="600"
        v-model="isLoginDialogOpen"
        @click:outside="$store.commit('setLoginDialogOpen', false)"
      >
        <v-card>
          <v-tabs v-model="loginTab" background-color="primary" slider-color="accent" dark grow>
            <v-tab>Log in</v-tab>
            <v-tab>Sign up</v-tab>
          </v-tabs>

          <v-tabs-items v-model="loginTab">
            <v-tab-item>
              <LoginCard />
            </v-tab-item>
            <v-tab-item>
              <SignupCard />
            </v-tab-item>
          </v-tabs-items>
        </v-card>
      </v-dialog>

      <v-dialog
        :retain-focus="false"
        max-width="600"
        v-model="isTransferDialogOpen"
        @click:outside="$store.commit('setTransferDialogOpen', { value: false })"
      >
        <ApproveTransfersCard
          closable
          :pending-transfers="pendingTransfers"
          @close="closeTransfer"
          @submit="submitTransfer"
        />
      </v-dialog>

      <v-dialog
        eager
        max-width="600"
        v-model="isSendTipDialogOpen"
        @click:outside="$store.commit('setSendTipDialogOpen', { value: false })"
      >
        <SendTipCard ref="sendTip" closable @close="closeTip" :recipient="sendTipRecipient" />
      </v-dialog>

      <FullScreenDialog v-model="isThreadDialogOpenProxy">
        <v-card v-if="isThreadDialogOpen">
          <v-card-title class="justify-end align-end text-right">
            <v-btn
              text
              class="mr-4"
              @click="$store.commit('setThreadDialogOpen', { value: false, path: $route.path })"
            >
              <v-icon>close</v-icon>Close
            </v-btn>
          </v-card-title>
          <v-card-text :class="{ 'dark': darkMode, 'light': !darkMode }">
            <v-row no-gutters>
              <v-col :cols="12">
                <ThreadBrowser
                  class="mt-0"
                  :referenceId="threadDialogRef1"
                  :referenceId2="threadDialogRef2"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </FullScreenDialog>

      <v-dialog
        v-model="isImageUploadDialogOpen"
        max-width="600"
        @click:outside="$store.commit('setImageUploadDialogOpen', { value: false })"
      >
        <ImageUploadCard />
      </v-dialog>

      <v-dialog
        v-model="isInsertLinkDialogOpen"
        max-width="600"
        @click:outside="$store.commit('setInsertLinkDialogOpen', { value: false })"
      >
        <InsertLinkCard />
      </v-dialog>

      <ImageViewer ref="imgViewer" :images="imgViewerSrcs" />

      <v-container fluid>
        <v-row no-gutters>
          <v-col cols="12">
            <router-view></router-view>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { getUserAccountObject } from "@/novusphere-js/discussions/api";
import { subscribeAccount } from "@/novusphere-js/discussions/gateway";

import AppBar from "@/components/AppBar";
//import AppDrawer from "@/components/AppDrawer";
import AppAlertBar from "@/components/AppAlertBar";
import LoginCard from "@/components/LoginCard";
import SignupCard from "@/components/SignupCard";
import ImageUploadCard from "@/components/MarkdownEditor/ImageUploadCard";
import InsertLinkCard from "@/components/MarkdownEditor/InsertLinkCard";
import ApproveTransfersCard from "@/components/ApproveTransfersCard";
import SendTipCard from "@/components/SendTipCard";
import ThreadBrowser from "@/components/ThreadBrowser";
import UserProfileCard from "@/components/UserProfileCard";
import CommunityCard from "@/components/CommunityCard";
import FullScreenDialog from "@/components/FullScreenDialog";
import ImageViewer from "@/components/ImageViewer";


export default {
  name: "App",
  components: {
    AppBar,
    //AppDrawer,
    AppAlertBar,
    LoginCard,
    SignupCard,
    ImageUploadCard,
    InsertLinkCard,
    ApproveTransfersCard,
    SendTipCard,
    ThreadBrowser,
    UserProfileCard,
    CommunityCard,
    FullScreenDialog,
    ImageViewer,

  },
  watch: {
    imgViewerSrcs() {
      if (this.imgViewerSrcs.length > 0) {
        this.$refs.imgViewer.show();
      }
    },
    darkMode() {
      this.$vuetify.theme.dark = this.darkMode;
      this.setThemeClass();
    },
    async isSendTipDialogOpen() {
      const sendTip = this.$refs.sendTip;
      if (sendTip && this.isSendTipDialogOpen) {
        await sendTip.refresh();
      }
    },
    async needSyncAccount() {
      if (!this.needSyncAccount) return;

      console.log(`Synchronizing account...`);

      let account = await getUserAccountObject(this.keys.identity.key);

      if (account && account.data) {
        console.log(`Retrieved account successfully`);
      } else {
        console.log(`Did not find account... checking for legacy account...`);
        const oldAccount = await getUserAccountObject(
          this.keys.identity.key,
          `https://discussions.app`
        );

        // TO-REMOVE: migration code
        // note: "https://" is no longer in new acccount domains

        if (oldAccount) {
          console.log(`Found old Discussions account... trying to migrate...`);
          console.log(oldAccount);

          // upgrade to new object format
          const migrated = {
            // NOTE: we didn't bother migrating watched posts
            subscribedTags: oldAccount.data.tags,
            followingUsers: oldAccount.data.following.map((fu) => ({
              pub: fu.pub,
              displayName: fu.name,
            })),
            data: {
              lastSeenNotificationsTime:
                oldAccount.data.lastCheckedNotifications,
              delegatedMods: oldAccount.data.moderation.delegated.map((m) => {
                const [displayName, pub] = m[0].split(":");
                return { displayName, pub, tag: m[1] };
              }),
            },
          };

          //console.log(migrated);
          console.log(`Migration OK`);
          account = migrated;
        } else {
          console.log(`Did not find legacy account`);
        }
      }

      subscribeAccount(this.keys.identity.key);
      this.$store.commit("syncAccount", account);
    },
  },
  computed: {
    profilePopover: {
      get() {
        return this.popover.profile.open;
      },
      set(value) {
        if (value) return;
        this.$store.commit("setPopoverOpen", {
          value: false,
          type: "profile",
        });
      },
    },
    tagPopover: {
      get() {
        return this.popover.tag.open;
      },
      set(value) {
        if (value) return;
        this.$store.commit("setPopoverOpen", {
          value: false,
          type: "tag",
        });
      },
    },
    theme() {
      return this.darkMode ? "dark" : "light";
    },
    isLoggedIn() {
      return this.$store.getters.isLoggedIn;
    },
    isThreadDialogOpenProxy: {
      get() {
        return this.isThreadDialogOpen;
      },
      set(value) {
        console.log(`isThreadDialogOpenProxy - ${value}`);
        if (value) return;
        this.$store.commit("setThreadDialogOpen", {
          value: false,
          path: this.$route.path,
        });
      },
    },
    ...mapGetters(["isPopoverOpen"]),
    ...mapState({
      imgViewerSrcs: (state) => state.imgViewerSrcs,
      darkMode: (state) => state.darkMode,
      syncTime: (state) => state.syncTime,
      needSyncAccount: (state) => state.needSyncAccount,
      popover: (state) => state.popover,
      isLoginDialogOpen: (state) => state.isLoginDialogOpen,
      isTransferDialogOpen: (state) => state.isTransferDialogOpen,
      isSendTipDialogOpen: (state) => state.isSendTipDialogOpen,
      isThreadDialogOpen: (state) => state.isThreadDialogOpen,
      isImageUploadDialogOpen: (state) => state.isImageUploadDialogOpen,
      isInsertLinkDialogOpen: (state) => state.isInsertLinkDialogOpen,
      threadDialogRef1: (state) => state.threadDialogRef1,
      threadDialogRef2: (state) => state.threadDialogRef2,
      pendingTransfers: (state) => state.pendingTransfers,
      sendTipRecipient: (state) => state.sendTipRecipient,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    loginTab: null,
  }),
  created() {
    window.$app = this;
    this.setThemeClass();

    this.$store.commit("init");
    window.addEventListener(
      "accountChange",
      ({ detail: { payload: account } }) => {
        console.log(
          `Remote sync, local=${this.syncTime}, remote=${account.data.syncTime}`
        );

        if (!this.syncTime || account.data.syncTime > this.syncTime) {
          this.$store.commit("syncAccount", account);
        }
      }
    );
  },
  beforeDestroy() {},
  methods: {
    setThemeClass() {
      const nodes = [document.body];
      for (const node of nodes) {
        const classes = node.className
          .split(" ")
          .filter((cn) => cn != "dark" && cn != "light");
        node.className = classes.join(" ") + (this.darkMode ? "dark" : "light");
      }
    },
    async closeTip() {
      this.$store.commit("setSendTipDialogOpen", { value: false });
    },
    async closeTransfer() {
      this.$store.commit("setTransferDialogOpen", { value: false });
    },
    async submitTransfer(password) {
      this.$store.commit("setTempPassword", password);
      this.$store.commit("setTransferDialogOpen", { value: false });
    },
  },
};
</script>

<style>

.text-decoration-ellipsis {
  text-overflow: ellipsis;

  /* Required for text-overflow to do anything */
  white-space: nowrap; /*prevents text wrap in whitespace*/
  //overflow: hidden; /* truncates overflow text */
}

blockquote { /* Required for quoting in replies */
  border-left: 4px solid #ccc;
  margin-bottom: 5px;
  margin-top: 5px;
  padding-left: 16px;
}
</style>
