import express from "express";
import { authorization } from "../common/middleware/authorization";
import { verifyToken } from "../common/middleware/verifyToken";
import { requireAuthentication } from "../common/middleware/require-auth";
import { authenticateIfUser } from "../common/middleware/authenticate-if-user";

import { mediaUploadHandler } from "../controllers/media.controller";
import MediaStorage from "../common/middleware/storage";
import {
  checkLikedByMe,
  createTweetHandler,
  deleteTweetHandler,
  getForYouTweets,
  getMyTweets,
  getTweetById,
  getUserTweets,
  toggleTweetLike,
  updateTweetHandler,
} from "controllers/tweet.controller";
const router = express.Router();

const userAreaHandler = [verifyToken, requireAuthentication];

// get for you tweets
router.get("/tweets", userAreaHandler, getForYouTweets);

// get current user tweets
router.get("/my-tweets", userAreaHandler, getMyTweets);

// get tweet by tweetID
router.get("/tweet/:id", userAreaHandler, getTweetById);

router.patch("/tweet/:id/like", userAreaHandler, toggleTweetLike);
router.get("/tweet/:id/likedByMe", userAreaHandler, checkLikedByMe);

// create/post new tweet
router.post("/tweet/new", userAreaHandler, createTweetHandler);

// get requested user tweets
router.get("/tweets/u/:userID", userAreaHandler, getUserTweets);

const storage = new MediaStorage({ uploadDir: "user_tweet_media/" });

// upload tweet media
router.put(
  "/tweet/media",
  [...userAreaHandler, storage.store.single("file")],
  mediaUploadHandler
);

router.patch("/tweet/:id", userAreaHandler, updateTweetHandler);
router.delete("/tweet/:id", userAreaHandler, deleteTweetHandler);

export default router;
