<template>
  <v-list>
    <v-list-item>
    <v-switch v-if="!$vuetify.breakpoint.mobile" v-model="hideSpamProxy" :label="`Hide Spam Content`"></v-switch>
    </v-list-item>
    <v-list-item>
    <v-switch v-if="!$vuetify.breakpoint.mobile" v-model="blurNSFWProxy" :label="`Blur NSFW Content`"></v-switch>
    </v-list-item>
  </v-list>
</template>

<script>
import { mapState, mapGetters } from "vuex";

export default {
  name: "ModerationNav",
  components: {
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
      keys: (state) => state.keys,
      displayName: (state) => state.displayName,
    }),
  },
  data: () => ({
    menu: false,
  }),
};
</script>