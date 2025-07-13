import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

// Initialize Twitter client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY as string,
  appSecret: process.env.TWITTER_API_SECRET as string,
});

export async function GET() {
  try {
    // Generate OAuth 2.0 URL
    const { url, state, codeVerifier } = await client.generateOAuth2AuthLink(
      process.env.TWITTER_CALLBACK_URL as string,
      { scope: ['tweet.read', 'users.read'] }
    );

    // Store state and code verifier in session/cookie for verification during callback
    // You'll need to implement proper session management here

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating Twitter auth link:', error);
    return NextResponse.json(
      { error: 'Failed to generate Twitter authentication link' },
      { status: 500 }
    );
  }
}