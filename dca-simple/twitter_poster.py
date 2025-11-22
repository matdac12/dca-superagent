"""
Twitter Poster for DCA Bot

Posts minimal daily DCA decision updates to X (Twitter).
"""
import os
import tweepy
from typing import Optional
from loguru import logger


class TwitterPoster:
    """Post DCA decision updates to X (Twitter)"""

    def __init__(self):
        """Initialize Twitter poster with OAuth 1.0a credentials from env"""
        self.api_key = os.getenv('TWITTER_API_KEY')
        self.api_secret = os.getenv('TWITTER_API_SECRET')
        self.access_token = os.getenv('TWITTER_ACCESS_TOKEN')
        self.access_token_secret = os.getenv('TWITTER_ACCESS_TOKEN_SECRET')

        if not all([self.api_key, self.api_secret, self.access_token, self.access_token_secret]):
            logger.warning("Twitter credentials not found in .env - posting disabled")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("Twitter poster initialized")

    def post_tweet(self, message: str) -> bool:
        """
        Post a tweet to X

        Args:
            message: Tweet text (max 280 characters)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.warning("Twitter posting disabled - missing credentials")
            return False

        if len(message) > 280:
            logger.error(f"Tweet too long: {len(message)} characters (max 280)")
            return False

        try:
            # Use v2 API for posting
            client = tweepy.Client(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_token_secret
            )

            response = client.create_tweet(text=message)
            tweet_id = response.data['id']

            logger.info(f"Tweet posted successfully: {tweet_id}")
            logger.debug(f"Tweet content: {message}")

            return True

        except tweepy.errors.Unauthorized as e:
            logger.error(f"Twitter authentication failed: {e}")
            return False

        except tweepy.errors.Forbidden as e:
            logger.error(f"Twitter permission error: {e}")
            return False

        except tweepy.errors.TooManyRequests as e:
            logger.error(f"Twitter rate limit exceeded: {e}")
            return False

        except Exception as e:
            logger.error(f"Failed to post tweet: {type(e).__name__}: {e}")
            return False


if __name__ == '__main__':
    """Test Twitter poster"""
    from dotenv import load_dotenv
    load_dotenv()

    poster = TwitterPoster()

    if poster.enabled:
        print("Testing Twitter poster...")
        test_message = "🤖 DCA Bot Test\n\nTesting minimal tweet format.\n\nPortfolio: €1,000\nP&L: +5.0%"

        print(f"\nTweet ({len(test_message)} chars):")
        print("-" * 40)
        print(test_message)
        print("-" * 40)

        if poster.post_tweet(test_message):
            print("\n✅ Test tweet posted successfully!")
        else:
            print("\n❌ Failed to post test tweet")
    else:
        print("❌ Twitter not configured. Add credentials to .env file.")
