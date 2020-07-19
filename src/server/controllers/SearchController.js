import { Controller, Get, Post, All } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/search')
export default class SearchController {
    constructor() {
    }

    @Api()
    @All("/posts")
    async searchPosts(req, res) {
        let { id, pipeline, count, limit, sort, votePublicKey, includeOpeningPost, moderatorKeys } = req.unpack();

        if (!pipeline || !Array.isArray(pipeline)) throw new Error(`Pipeline must be specified and of type Array`);

        id = id || 0;
        count = count || 0;
        limit = Math.max(Math.min(Number(limit || 20), 100), 1);

        // pipeline helpers

        if (sort) {
            this.addSortToPipeline(sort.toLowerCase(), pipeline);
        }

        if (votePublicKey) {
            this.addMyVoteToPipeline(votePublicKey, pipeline);
        }

        if (moderatorKeys && moderatorKeys.length) {
            this.addModeratorPolicyToPipeline(moderatorKeys, pipeline);
        }

        if (includeOpeningPost) {
            this.addOpeningPostToPipeline(pipeline);
        }

        if (!this.cursors) {
            this.cursors = {};
        }

        let cursor = id ? this.getCursorById(id) : undefined;
        if (!cursor) {
            const db = await getDatabase();
            cursor = await db.collection(config.table.posts).aggregate(pipeline);
            id = this.addCursor(cursor);
        }

        const posts = [];
        while (posts.length < limit && await cursor.hasNext()) {
            posts.push(await cursor.next());
            count++;
        }

        if ((await cursor.isClosed()) || !(await cursor.hasNext())) {
            this.removeCursorById(id);
            id = 0;
        }

        this.cleanCursors();

        return res.success({
            posts,
            id,
            count,
            limit
        });
    }

    cleanCursors() {
        const now = Date.now();
        for (const { id, time } of Object.values(this.cursors)) {
            if (now - time >= 60000) {
                this.removeCursorById(id);
            }
        }
    }

    removeCursorById(id) {
        delete (this.cursors[id]);
    }

    getCursorById(id) {
        const obj = this.cursors[id];
        return obj ? obj.cursor : undefined;
    }

    addCursor(cursor) {
        const id = ((Math.random() * 0x7fffffff) | 0);
        const obj = { id, cursor, time: Date.now() };
        this.cursors[id] = obj;
        return id;
    }

    addOpeningPostToPipeline(pipeline) {
        pipeline.push({
            $lookup: {
                from: config.table.posts,
                localField: "threadUuid",
                foreignField: "uuid",
                "as": "op"
            }
        });
    }

    addMyVoteToPipeline(votePublicKey, pipeline) {
        pipeline.push(
            {
                "$lookup":
                {
                    from: config.table.votes,
                    let: { uuid: "$uuid" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$pub", votePublicKey] },
                                        { $eq: ["$uuid", "$$uuid"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "myVote"
                }
            });
    }

    addModeratorPolicyToPipeline(moderatorKeys, pipeline) {
        pipeline.push({
            "$lookup":
            {
                from: config.table.moderation,
                let: { uuid: "$uuid" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ["$pub", moderatorKeys] },
                                    { $eq: ["$uuid", "$$uuid"] }
                                ]
                            }
                        }
                    },
                    {
                        $project:
                        {
                            _id: false,
                            mod: "$pub",
                            tags: "$tags",
                            domain: "$domain"
                        }
                    }
                ],
                as: "modPolicy"
            }
        });
    }

    addSortToPipeline(sort, pipeline) {
        const G = 1.8;
        if (sort == 'popular') {
            let now = new Date().getTime();
            pipeline.push({
                $addFields: {
                    // score = (tipscore+upvotes-downvotes)/(T+2)^G -- T=time since post in hrs, G=1.8
                    score: {
                        $divide: [
                            {
                                $add: [
                                    "$tipscore",
                                    { $subtract: ["$upvotes", "$downvotes"] }
                                ]
                            },
                            {
                                $pow: [
                                    { $add: [{ $divide: [{ $subtract: [now, "$createdAt"] }, 3600] }, 2] },
                                    G
                                ]
                            }
                        ]
                    }
                }
            });
            pipeline.push({
                $sort: {
                    score: -1
                }
            });
        }
        else if (sort == 'controversial') {
            let now = new Date().getTime();
            pipeline.push({
                $addFields: {
                    // score = ((upvotes+downvotes)^(downvotes/upvotes))/((T+2)^G)
                    score: {
                        $divide: [
                            {
                                $pow: [
                                    { $add: ["$upvotes", "$downvotes"] },
                                    { $divide: ["$downvotes", { $max: ["$upvotes", 1] }] }
                                ]
                            },
                            {
                                $pow: [
                                    { $add: [{ $divide: [{ $subtract: [now, "$createdAt"] }, 3600] }, 2] },
                                    G
                                ]
                            }
                        ]
                    }
                }
            });
            pipeline.push({
                $sort: {
                    score: -1
                }
            });
        }
        else if (sort == 'old') {
            // score = T
            pipeline.push({
                $sort: {
                    createdAt: 1,
                }
            });
        }
        else if (sort == 'recent') {
            // score = T
            pipeline.push({
                $sort: {
                    createdAt: -1,
                }
            });
        }
    }
}