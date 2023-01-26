import { Request, Response } from "express";
import { mediaModel } from "models/media.model";
import { BadRequestError } from "../common/errors/bad-request-error";
import { tweetModel } from "../models/tweet.model";
import { userModel } from "../models/user.model";
import { sortByKey } from "../utils/array";
import { tweetReplyModel } from "../models/tweetReply.model";
import { likeModel } from "../models/like.model";

// user new tweeet
export async function createTweetHandler(req: Request, res: Response) {
  const body = req.body;

  try {
    let newTweet = await tweetModel.create({
      ...body,
      owner: req["_user"].id,
    });

    newTweet = await newTweet.populate("attachments");
    await newTweet.populate("owner", "name username profile bio count");

    return res.status(201).send(newTweet.toJSON());
  } catch (e: any) {
    return res.status(500).send({ status: "ERROR", message: e });
  }
}

// save tweet reply
export async function createTweetReplyHandler(req: Request, res: Response) {
  const body = req.body;
  const { tweetID, replyTweetID } = req.params;

  try {
    let newTweet = await tweetReplyModel.create({
      ...body,
      tweet: tweetID,
      replyTo: replyTweetID,
      owner: req["_user"].id,
    });

    newTweet = await newTweet.populate("attachments");

    return res.status(201).send(newTweet.toJSON());
  } catch (e: any) {
    return res.status(500).send({ status: "ERROR", message: e });
  }
}

// get for you tweets AI logic
export async function getForYouTweets(req: Request, res: Response) {
  const listMode = req.query?.["list"];
  const includeID = req.query?.["id"];
  const following = req.query?.["following"]; // for getting tweets from followings only

  const userId = req["_user"].id;
  const projection = {
    ...(listMode && { content: 1, _id: includeID ? 1 : 0 }),
  };
  try {
    //TODO: get recent top tweets from followings

    const tweets = await tweetModel
      .find({}, projection)
      .populate("owner", "name username profile bio count")
      .populate("attachments", "id path url mimetype");
    const _tweets = sortByKey(tweets, "createdAt", { reverse: true });
    res.send(_tweets);
  } catch (e: any) {
    res.status(500).send({ status: "ERROR", message: e });
  }
}

// list of all available connected users with last tweet
export async function getMyTweets(req: Request, res: Response) {
  const listMode = req.query?.["list"];
  const includeID = req.query?.["id"];

  const userId = req["_user"].id;
  const projection = {
    ...(listMode && { content: 1, _id: includeID ? 1 : 0 }),
  };
  try {
    const userTweets = await tweetModel.find({ owner: userId }, projection);
    res.send(userTweets);
  } catch (e: any) {
    res.status(500).send({ status: "ERROR", message: e });
  }
}

export async function getUserTweets(req: Request, res: Response) {
  const { userID } = req.params;
  const listMode = req.query?.["list"];
  const includeID = req.query?.["id"];

  const projection = {
    ...(listMode && { content: 1, _id: includeID ? 1 : 0 }),
  };
  try {
    // find userID by username
    const tweetUser = await userModel.findOne({ username: userID });
    const userTweets = await tweetModel
      .find({ owner: tweetUser?.id }, projection)
      .populate("owner", "name username profile bio count")
      .populate("attachments", "id path url mimetype");
    const _tweets = sortByKey(userTweets, "createdAt", { reverse: true });
    res.send(_tweets);
  } catch (e: any) {
    console.log(e);

    res.status(500).send({
      status: "ERROR",
      message: "Failed to get requested user tweets",
    });
  }
}

export async function getTweetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tweet = await tweetModel
      .findById(id)
      .populate("attachments", "id type size cdn");
    // find tweet replies

    res.send(tweet);
  } catch (error) {
    res.status(404).send({ message: "Tweet doesn't exists!" });
  }
}

export async function updateTweetHandler(req: Request, res: Response) {
  const { id } = req.params;
  const tweet = await tweetModel.findById(id);
  if (!tweet) {
    return res
      .status(404)
      .send({ status: "ERROR", message: "Tweet doesn't exists!" });
  }

  await tweetModel.findByIdAndUpdate(id, { $set: req.body });
  const updatedTweet = await tweetModel
    .findById(id)
    .populate("owner", "name username profile bio count")
    .populate("attachments", "id path url mimetype");

  return res.send(updatedTweet);
}

export async function checkLikedByMe(req: Request, res: Response, next) {
  const { id } = req.params;
  const tweet = await tweetModel.findById(id);
  if (!tweet) return next(new BadRequestError("Tweet doesn't exists!"));
  const isLiked = await likeModel.findOne({
    tweet: id,
    likedBy: req["_user"].id,
  });
  res.send({ liked: isLiked ? true : false });
}

export async function toggleTweetLike(req: Request, res: Response, next) {
  const { id } = req.params;
  const tweet = await tweetModel.findById(id);

  if (!tweet) return next(new BadRequestError("Tweet doesn't exists!"));

  try {
    // find tweet is already liked or not
    const isLiked = await likeModel.findOne({
      tweet: id,
      likedBy: req["_user"].id,
    });

    if (isLiked) await isLiked?.delete();
    else await likeModel.create({ tweet: id, likedBy: req["_user"].id });

    // find like count
    const likes = await likeModel.count({ tweet: id });
    tweet.likeCount = likes;
    tweet.save();

    res.send({ likes });
  } catch (error) {
    next(new BadRequestError("Tweet couldn't like!"));
  }
}

export async function deleteTweetHandler(req: Request, res: Response, next) {
  const { id } = req.params;
  try {
    const tweet = await tweetModel.findById(id);
    if (!tweet) next(new BadRequestError("Tweet doesn't exists"));

    for await (const mediaID of tweet?.attachments!) {
      const media = await mediaModel.findById(mediaID);
      if (media) await media.deletePermanently();
    }

    await tweet?.delete();

    res.end();
  } catch (error) {
    next(new BadRequestError("Tweet couldn't delete!"));
  }
}

// ====================

// get following/following user liked tweets/recommended tweets
export async function getTweetForMe(req: Request, res: Response, next) {
  try {
  } catch (error) {
    next(new BadRequestError("Couldn't fetch tweet for you!"));
  }
}

// tweets from followings as well as retweets
export async function getMyTweetFeed(req: Request, res: Response, next) {
  try {
  } catch (error) {
    next(new BadRequestError("Couldn't get my tweet feed!"));
  }
}

/// tweets from followings list without any retweets
export async function getFollowingTweets(req: Request, res: Response, next) {}
