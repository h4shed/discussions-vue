<template>
  <div class="editor">
    <div>
      <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
        <div class="menubar">
          <v-btn icon @click="commands.heading({ level: 1 })">
            <v-icon :class="{ 'is-active': isActive.heading({ level: 1 })  }">title</v-icon>
          </v-btn>

          <v-btn icon @click="commands.bullet_list">
            <v-icon :class="{ 'is-active': isActive.bullet_list() }">format_list_bulleted</v-icon>
          </v-btn>

          <v-btn icon @click="commands.ordered_list">
            <v-icon :class="{ 'is-active': isActive.ordered_list() }">format_list_numbered</v-icon>
          </v-btn>

          <v-btn icon @click="commands.bold">
            <v-icon :class="{ 'is-active': isActive.bold() }">format_bold</v-icon>
          </v-btn>

          <v-btn icon @click="commands.italic">
            <v-icon :class="{ 'is-active': isActive.italic() }">format_italic</v-icon>
          </v-btn>

          <v-btn icon @click="commands.blockquote">
            <v-icon :class="{ 'is-active': isActive.blockquote() }">format_quote</v-icon>
          </v-btn>

          <v-btn icon @click="commands.code_block">
            <v-icon :class="{ 'is-active': isActive.code_block() }">code</v-icon>
          </v-btn>

          <v-btn icon @click="insertLink(commands.link)">
            <v-icon :class="{ 'is-active': isActive.link() }">insert_link</v-icon>
          </v-btn>

          <v-btn icon @click="uploadImage(commands.image)">
            <v-icon>insert_photo</v-icon>
          </v-btn>
        </div>
      </editor-menu-bar>

      <editor-content ref="editorContent" class="editor-content" :editor="editor" />
    </div>

    <v-menu
      :content-class="darkMode ? 'dark' : 'light'"
      max-height="50vh"
      z-index="9999"
      :value="showSuggestions"
      :close-on-content-click="false"
      :position-x="popoverX"
      :position-y="popoverY"
    >
      <v-card>
        <v-card-text>
          <template v-if="hasResults">
            <v-list-item v-for="(user, i) in filteredUsers" :key="i" @click="selectUser(user)">
              <PublicKeyIcon class="mr-2" :publicKey="user.pub" />
              {{ user.displayName[0] }}
            </v-list-item>
          </template>
          <div v-else>
            <v-card-text>No users found</v-card-text>
          </div>
        </v-card-text>
      </v-card>
    </v-menu>
  </div>
</template>

<script>
import { mapState } from "vuex";
import PublicKeyIcon from "@/components/PublicKeyIcon";
import { Editor, EditorContent, EditorMenuBar } from "tiptap";
import {
  Blockquote,
  CodeBlock,
  //HardBreak,
  Heading,
  OrderedList,
  BulletList,
  ListItem,
  //TodoItem,
  //TodoList,
  Bold,
  //Code,
  Italic,
  //Strike,
  //Underline,
  Image,
  History,
} from "tiptap-extensions";

import Link2 from "./nodes/Link2";
import { Mention/*, MentionPaste*/ } from "./nodes/Mention";
import { Hashtag, HashtagPaste } from "./nodes/Hashtag";

import { htmlToMarkdown, markdownToHTML } from "@/novusphere-js/utility";

export default {
  name: "MarkdownEditor",

  components: {
    EditorMenuBar,
    EditorContent,
    PublicKeyIcon,
  },
  props: {
    mentionSuggester: Function,
  },
  data() {
    return {
      hasMounted: false,
      //
      popoverX: 0,
      popoverY: 0,
      //popoverNode: null,
      // mention suggestion
      query: null,
      suggestionRange: null,
      filteredUsers: [],
      insertMention: () => {},
      // hashtag insertion
      tag: null,
      tagRange: null,
      insertTag: () => {},
      // editor
      editor: new Editor({
        onUpdate: () => this.$emit("change"),
        extensions: [
          new Hashtag({
            // is called when a suggestion starts
            onEnter: ({ query, range, command }) => {
              this.tag = query;
              this.tagRange = range;
              // we save the command for inserting a selected mention
              // this allows us to call it inside of our custom popup
              // via keyboard navigation and on click
              this.insertTag = ({ range }) => {
                const tag = this.tag.replace(/[^a-zA-Z0-9]/gi, "");
                if (tag) {
                  command({
                    range,
                    attrs: {
                      tag: tag,
                      href: `/tag/${tag}`,
                    },
                  });
                } else {
                  const transaction = this.editor.state.tr.insertText(" ");
                  this.editor.view.dispatch(transaction);
                }
              };

              //console.log(`hash enter: ${this.tag}`);
            },
            // is called when a suggestion has changed
            onChange: ({ query, range }) => {
              this.tag = query;
              this.tagRange = range;

              //console.log(`hash change: ${this.tag}`);
            },
            // is called when a suggestion is cancelled
            onExit: () => {
              if (this.tag) {
                //console.log(`hash exit: ${this.tag}`);
                // this is pretty much a hack
                const android = /Android \d/.test(navigator.userAgent);
                if (android) {
                  this.insertTag({
                    range: {
                      from: this.tagRange.from,
                      to: this.tagRange.to + 1,
                    },
                  });
                  this.editor.focus();
                }
              }
              this.tag = null;
              this.tagRange = null;
              this.insertTag = () => {};
            },
            // is called on every keyDown event while a suggestion is active
            onKeyDown: ({ event }) => {
              if (
                event.key === "Enter" ||
                event.key == "Tab" ||
                event.key == " "
              ) {
                //console.log(`hash keydown: ${this.tag}`);

                this.insertTag({ range: this.tagRange });

                this.editor.focus();
                return true;
              }
              return false;
            },
          }),

          new Mention({
            // is called when a suggestion starts
            onEnter: ({ items, query, range, command, virtualNode }) => {
              this.query = query;
              this.filteredUsers = items;
              this.suggestionRange = range;
              this.renderPopup(virtualNode);
              // we save the command for inserting a selected mention
              // this allows us to call it inside of our custom popup
              // via keyboard navigation and on click
              this.insertMention = command;
              //console.proxyLog(`mention enter: ${this.query}`);
            },
            // is called when a suggestion has changed
            onChange: ({ items, query, range, virtualNode }) => {
              this.query = query;
              this.filteredUsers = items;
              this.suggestionRange = range;
              this.renderPopup(virtualNode);
              //console.proxyLog(`mention change: ${this.query}`);
            },
            // is called when a suggestion is cancelled
            onExit: () => {
              // reset all saved values
              this.query = null;
              this.filteredUsers = [];
              this.suggestionRange = null;
              this.destroyPopup();
              //console.proxyLog(`mention exit`);
            },
            // is called on every keyDown event while a suggestion is active
            onKeyDown: ({ event }) => {
              if (
                event.key === "Enter" ||
                event.key == " " ||
                event.key == "Tab"
              ) {
                const user = this.filteredUsers[0];
                //console.proxyLog(
                //  `mention keydown: ${
                //    user ? JSON.stringify(user) : "[undefined]"
                //  }`
                //);
                if (user) {
                  this.selectUser(user);
                }
                return true;
              }
              return false;
            },
            // is called when a suggestion has changed
            onFilter: (_, query) => this.getMentionSuggestions(query),
          }),

          new Blockquote(),
          new CodeBlock(),
          new Heading({ levels: [1, 2, 3] }),
          new ListItem(),
          new BulletList(),
          new OrderedList(),
          new Bold(),
          new Image(),
          new Link2(),
          new HashtagPaste(),
          //new MentionPaste({
          //  onFilter: (_, query) => this.getMentionSuggestions(query),
          //}),
          new Italic(),
          new History(),
        ],
        content: ``,
      }),
    };
  },
  computed: {
    hasResults() {
      return this.filteredUsers.length;
    },
    showSuggestions() {
      return this.query || this.hasResults;
    },
    ...mapState({
      darkMode: (state) => state.darkMode,
    }),
  },
  async mounted() {
    this.hasMounted = true;
  },
  methods: {
    async insertLink(command) {
      const state = this.editor.state;

      // get marks, if any from selected area
      const { from, to } = state.selection;

      if (from == to) return; // no selection

      let marks = [];
      state.doc.nodesBetween(from, to, (node) => {
        marks = [...marks, ...node.marks];
      });

      const mark = marks.find((markItem) => markItem.type.name === "link");
      let presetUrl = mark && mark.attrs.href ? mark.attrs.href : "";

      this.$store.commit("setInsertLinkDialogOpen", {
        value: true,
        initialInsertedLink: presetUrl,
        onInsertLink: (href) => {
          command({ href: href });
          this.$store.commit("setInsertLinkDialogOpen", { value: false });
        },
      });
    },
    async uploadImage(command) {
      this.$store.commit("setImageUploadDialogOpen", {
        value: true,
        onImageUpload: (args) => {
          command(args);
          this.$store.commit("setImageUploadDialogOpen", { value: false });
        },
      });
    },
    getMentionSuggestions(query) {
      if (this.mentionSuggester) {
        return this.mentionSuggester(query);
      }
      return [];
    },
    getDocument() {
      const html = this.getHTML();
      const domParser = new DOMParser();
      const doc = domParser.parseFromString(html, "text/html");
      return doc;
    },
    getHTML() {
      return this.editor.getHTML();
    },
    getMarkdown() {
      const markdown = htmlToMarkdown(this.getHTML());
      return markdown;
    },
    getTips() {
      let tips = [];

      //
      // new implementation 8/27/2020, walk the document instead of regex
      //
      const doc = this.getDocument();
      for (const node of Array.from(doc.links)) {
        let href = node.href;

        if (!href.endsWith("/tag/tip")) continue;

        const tipText = node.nextSibling;
        if (!tipText) continue;
        if (tipText.nodeName != "#text") continue;

        let [quantity, symbol] = tipText.nodeValue.trim().split(" ");
        if (isNaN(quantity)) continue;

        quantity = parseFloat(quantity);
        if (quantity <= 0) continue;

        let pub = undefined;

        const atUser = tipText.nextSibling;
        if (atUser && atUser.nodeName == "A") {
          if (atUser.href.indexOf("/u/") != -1) {
            const userHrefFragment = atUser.href.split("-");
            const userPub = userHrefFragment[userHrefFragment.length - 1];
            pub = userPub;
          }
        }

        tips.push({ quantity, symbol, pub });
      }

      return tips;
    },
    getTags() {
      let tags = [];
      const doc = this.getDocument();
      for (const link of Array.from(doc.links)) {
        const hrefSplit = link.href.split("/");
        if (
          link.innerText.indexOf("#") == 0 &&
          hrefSplit.length >= 2 &&
          hrefSplit[hrefSplit.length - 2] == "tag"
        ) {
          tags.push(hrefSplit[hrefSplit.length - 1]);
        }
      }
      return tags;
    },
    getMentions() {
      let mentions = [];
      const doc = this.getDocument();
      for (const link of Array.from(doc.links)) {
        const hrefSplit = link.href.split("/");
        if (
          link.innerText.indexOf("@") == 0 &&
          hrefSplit.length >= 2 &&
          hrefSplit[hrefSplit.length - 2] == "u"
        ) {
          const who = hrefSplit[hrefSplit.length - 1].split("-");
          mentions.push({
            displayName: decodeURIComponent(who[who.length - 2]),
            pub: who[who.length - 1],
          });
        }
      }
      return mentions;
    },
    clear() {
      this.editor.setContent("");
    },
    setFromHtml(html) {
      this.editor.setContent(html);
    },
    setFromMarkdown(markdown) {
      const html = markdownToHTML(markdown);
      this.setFromHtml(html);
    },
    // we have to replace our suggestion text with a mention
    // so it's important to pass also the position of your suggestion text
    selectUser(user) {
      const displayName = user.displayName[user.displayName.length - 1].replace(
        /\s/g,
        "_"
      );

      this.insertMention({
        range: this.suggestionRange,
        attrs: {
          name: displayName, // replace spaces in name with an underscore
          href: `/u/${encodeURIComponent(displayName)}-${user.pub}`,
        },
      });
      this.editor.focus();
    },
    // renders a popup with suggestions
    renderPopup(node) {
      if (!node) return;

      let rect = node.getBoundingClientRect();
      this.popoverX = rect.x + rect.width + 10;
      this.popoverY = rect.y;
    },
    destroyPopup() {
      this.query = "";
    },
  },

  beforeDestroy() {
    this.destroyPopup();
    this.editor.destroy();
  },
};
</script>

<style >
.ProseMirror:focus {
  outline: none;
}

.ProseMirror img,
.ProseMirror iframe {
  min-width: 0px !important; /* instagram override */
  max-width: 100% !important;
  /*max-width: min(100%, 512px) !important;*/
  max-width: clamp(0px, 100%, 512px) !important;
  display: block;
}
</style>

<style lang="scss" scoped>
.editor {
  width: 100%;
  padding: 5px;
  border-style: solid;
  border-width: 1px;
}

.menubar {
  border-style: solid;
  border-width: 1px;
}

.is-active {
  color: white !important;
  background-color: black !important;
}
</style>