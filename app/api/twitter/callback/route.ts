import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required OAuth parameters' },
        { status: 400 }
      );
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY as string,
      appSecret: process.env.TWITTER_API_SECRET as string,
    });

    // Exchange the code for access token
    const {
      accessToken,
      client: loggedClient,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier: 'stored-verifier', // Should be retrieved from session
      redirectUri: process.env.TWITTER_CALLBACK_URL as string,
    });

    // Get the user's information
    const { data: userInfo } = await loggedClient.v2.me();

    return NextResponse.json({
      username: userInfo.username,
      id: userInfo.id,
    });
  } catch (error) {
    console.error('Error in Twitter callback:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with Twitter' },
      { status: 500 }
    );
  }
}