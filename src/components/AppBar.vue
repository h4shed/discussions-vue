<template>
      <v-card>
        <v-app-bar app color="secondary" hide-on-scroll>

    <v-btn v-if="!$vuetify.breakpoint.mobile" text color="primary" @click.stop="drawer = !drawer">
        <v-img alt="Logo" class="shrink" contain src="/static/logo.svg" transition="scale-transition"
        width="0"
        />
        <h3 class="ml-2" >Discussions</h3>
     </v-btn>

    <v-btn v-if="$vuetify.breakpoint.mobile" small dense text color="primary" @click.stop="drawer = !drawer">
        <v-icon>more_vert</v-icon>
    </v-btn>

    <v-text-field
        type="search"
        autocomplete="new-password"
        dense
        hide-details
        append-icon="search"
        class="mt-3"
        v-model="search"
        label="Search"
        rounded
        outlined
        @keydown.enter="goSearch()"
        @click:append="goSearch()"
        :readonly="searchReadonly"
        @focus="searchFocus()"
      ></v-text-field>


    <v-btn text @click="$router.push('/tag/all')" color="red">
      <v-icon>whatshot</v-icon>
    </v-btn>

      <v-btn v-if="isLoggedIn && !$vuetify.breakpoint.mobile" text @click="createPost()">
        <v-icon>create</v-icon>
      </v-btn>


      <NotificationsButton v-if="isLoggedIn && !$vuetify.breakpoint.mobile"/>

    <div v-if="$vuetify.breakpoint.mobile">

      <v-btn small dense v-if="isLoggedIn" text @click="createPost()">
        <v-icon>create</v-icon>
      </v-btn>
      <NotificationsButton small dense v-if="isLoggedIn" />
    </div>
    <v-spacer />
    <v-btn text @click="$store.commit('setDarkMode', !darkMode)">
      <v-icon>brightness_4</v-icon>
    </v-btn>
    <div v-if="!$vuetify.breakpoint.mobile">
    <v-menu offset-y :close-on-content-click="false" :max-height="$vuetify.breakpoint.height * 0.9">
      <template v-slot:activator="{ on, attrs }">
        <v-btn text color="primary" v-bind="attrs" v-on="on">
          <v-icon>api</v-icon>
        </v-btn>
      </template>
      <ModerationNav />
    </v-menu>
    </div>

    <v-btn v-if="!isLoggedIn && !$vuetify.breakpoint.mobile" text color="primary" @click="$store.commit('setLoginDialogOpen', true)">Log in</v-btn>
    <v-btn v-if="isLoggedIn && !$vuetify.breakpoint.mobile" text>
        <UserProfileLink :displayName="displayName" :publicKey="keys.arbitrary.pub" />
    </v-btn>
    <v-btn v-if="isLoggedIn && !$vuetify.breakpoint.mobile" text @click="$store.commit('logout')">
        <v-icon>power_settings_new</v-icon>
    </v-btn>
    <v-btn v-if="!isLoggedIn && $vuetify.breakpoint.mobile" text color="primary" @click="$store.commit('setLoginDialogOpen', true)">Log in</v-btn>

  </v-app-bar>
  
    <v-navigation-drawer app
      v-model="drawer"
      temporary
    >
      <v-list
        nav
        dense
      >
      </v-list>
        <AppNav />
        <AboutUsCard>
        <v-divider />
        </AboutUsCard>
    </v-navigation-drawer>

    </v-card>

</template>

<script>
import AppNav from "@/components/AppNav";
import ModerationNav from "@/components/ModerationNav";
import AboutUsCard from "@/components/AboutUsCard";
import UserProfileLink from "@/components/UserProfileLink";
import NotificationsButton from "@/components/NotificationsButton";
import { mapState, mapGetters } from "vuex";

export default {
  name: "AppBar",
  components: {
    AppNav,
    ModerationNav,
    AboutUsCard,
    UserProfileLink,
    NotificationsButton,
  },
  watch: {
    $route() {
      this.menu = false;
    },
  },
  props: {},
  computed: {
    hideSpamProxy: {
      get() {
        return this.hideSpam;
      },
      set(value) {
        this.$store.commit("set", ["hideSpam", value]);
      },
    },
    blurNSFWProxy: {
      get() {
        return this.blurNSFW;
      },
      set(value) {
        this.$store.commit("set", ["blurNSFW", value]);
      },
    },
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      hideSpam: (state) => state.hideSpam,
      blurNSFW: (state) => state.blurNSFW,
      darkMode: (state) => state.darkMode,
      displayName: (state) => state.displayName,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
      drawer: false,
      menu: false,
      group: null,
  }),
  methods: {
    async createPost() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      try {
        if (this.$route.params.tags) {
          // only take a single tag
          const tag = this.$route.params.tags.split(",")[0];
          await this.$router.push(`/tag/${tag}/submit`);
        } else if (this.$route.params.who && this.isLoggedIn) {
          const who = `${this.displayName}-${this.keys.arbitrary.pub}`;
          await this.$router.push(`/u/${who}/submit`);
        } else {
          await this.$router.push(`/submit`);
        }
      } catch (ex) {
        return; // Avoided redundant navigation
      }
    },
    async goSearch() {
      this.$router.push(`/search?q=${this.search}`);
    },
  },
};
</script>
