import { mapState, mapGetters } from "vuex";
import { followUser, unfollowUser, subscribeTag, unsubscribeTag } from "@/novusphere-js/discussions/api";

export const userActionsMixin = {
    computed: {
        ...mapGetters(["isLoggedIn"]),
        ...mapState({
            keys: (state) => state.keys,
            followingUsers: (state) => state.followingUsers
        })
    },
    methods: {
        openLoginDialog() {
            this.$store.commit('setLoginDialogOpen', true);
        },
        async followUser({ displayName, pub, uidw }) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            if (pub == this.keys.arbitrary.pub) return; // self follow disallowed
            if (this.followingUsers.find(u => u.pub == pub)) return;

            const nameTime = Date.now();
            this.$store.commit('followUser', {
                displayName, pub, uidw, nameTime,
                beforeSaveCallback: async () => await followUser(this.keys.identity.key, { displayName, pub, uidw, nameTime })
            });
        },
        async unfollowUser(pub) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            this.$store.commit('unfollowUser', {
                pub,
                beforeSaveCallback: async () => await unfollowUser(this.keys.identity.key, pub)
            });
        },
        async subscribeTag(tag) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            tag = tag.toLowerCase();
            this.$store.commit("subscribeTag", {
                tag,
                beforeSaveCallback: async () => await subscribeTag(this.keys.identity.key, tag)
            });
        },
        async unsubscribeTag(tag) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            tag = tag.toLowerCase();
            this.$store.commit("unsubscribeTag", {
                tag,
                beforeSaveCallback: async () => await unsubscribeTag(this.keys.identity.key, tag)
            });
        }
    }
}